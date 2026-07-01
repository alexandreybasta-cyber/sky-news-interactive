import asyncio
import time
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.websocket_manager import manager
from services.news_engine import generate_news
from services.video_fetcher import search_video
from services.heygen_avatar import create_session, send_text, close_session, generate_fallback_audio

router = APIRouter()

# Track active HeyGen sessions for cleanup on disconnect
_active_heygen_sessions: Dict[str, str] = {}  # session_id -> stream_id


def make_message(msg_type: str, session_id: str, payload: dict) -> dict:
    return {
        "type": msg_type,
        "session_id": session_id,
        "timestamp": time.time(),
        "payload": payload,
    }


async def reset_to_idle(session_id: str, delay: float = 30.0):
    """After a delay, broadcast avatar state back to idle and close HeyGen session."""
    await asyncio.sleep(delay)
    # Close HeyGen session if active
    stream_id = _active_heygen_sessions.pop(session_id, None)
    if stream_id:
        await close_session(stream_id, duration_seconds=delay)
    msg = make_message("avatar_state_change", session_id, {"state": "idle"})
    await manager.broadcast_to_session(session_id, msg)


async def process_text_input(session_id: str, text: str):
    """Process a text input from the tablet through the full pipeline."""
    try:
        # 1. Avatar → listen
        await manager.broadcast_to_session(
            session_id,
            make_message("avatar_state_change", session_id, {"state": "listen"}),
        )

        # 2. Broadcast the speech result
        await manager.broadcast_to_session(
            session_id,
            make_message("speech_result", session_id, {"text": text, "is_final": True}),
        )

        # 3. Avatar → think
        await manager.broadcast_to_session(
            session_id,
            make_message("avatar_state_change", session_id, {"state": "think"}),
        )

        # 4. Generate news and search video in parallel
        news_data, video_data = await asyncio.gather(
            generate_news(text),
            search_video(text),  # Will use video_search_term from news_data later if needed
        )

        # Update video search with better term from news_data
        if news_data.get("video_search_term") and news_data["video_search_term"] != text:
            video_data = await search_video(news_data["video_search_term"])

        # 5. Try HeyGen session OR generate Edge TTS fallback
        heygen_session = await create_session()
        audio_filename = ""

        if not heygen_session:
            # Fallback: generate Edge TTS audio
            speaking_script = news_data.get("speaking_script", news_data.get("headline", ""))
            audio_filename = await generate_fallback_audio(speaking_script)

        # 6. Avatar → present
        await manager.broadcast_to_session(
            session_id,
            make_message("avatar_state_change", session_id, {"state": "present"}),
        )

        # 7. Broadcast avatar stream info
        await manager.broadcast_to_session(
            session_id,
            make_message("avatar_stream", session_id, {
                "stream_url": heygen_session["stream_url"] if heygen_session else None,
                "stream_id": heygen_session["stream_id"] if heygen_session else None,
                "audio_url": f"/api/audio/{audio_filename}" if audio_filename else None,
            }),
        )

        # 8. Broadcast news result
        await manager.broadcast_to_session(
            session_id,
            make_message("news_result", session_id, news_data),
        )

        # 9. Broadcast video result
        await manager.broadcast_to_session(
            session_id,
            make_message("video_result", session_id, video_data),
        )

        # 10. If HeyGen session exists, send the speaking script
        if heygen_session:
            speaking_script = news_data.get("speaking_script", news_data.get("headline", ""))
            await send_text(heygen_session["stream_id"], speaking_script)
            _active_heygen_sessions[session_id] = heygen_session["stream_id"]

        # 11. Schedule return to idle after 30 seconds
        asyncio.create_task(reset_to_idle(session_id))

    except Exception as e:
        await manager.broadcast_to_session(
            session_id,
            make_message("error", session_id, {"code": "PROCESSING_ERROR", "message": str(e)}),
        )


@router.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)

    # Send initial idle state to the connecting client
    await manager.send_to_one(
        websocket,
        make_message("avatar_state_change", session_id, {"state": "idle"}),
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "text_input":
                text = data.get("payload", {}).get("text", "")
                if text:
                    # Process in background so we don't block the WS loop
                    asyncio.create_task(process_text_input(session_id, text))
                else:
                    await manager.send_to_one(
                        websocket,
                        make_message("error", session_id, {"code": "EMPTY_INPUT", "message": "No text provided"}),
                    )
            else:
                await manager.send_to_one(
                    websocket,
                    make_message("error", session_id, {"code": "UNKNOWN_TYPE", "message": f"Unknown message type: {msg_type}"}),
                )

    except WebSocketDisconnect:
        # Cleanup HeyGen session on disconnect
        stream_id = _active_heygen_sessions.pop(session_id, None)
        if stream_id:
            await close_session(stream_id, duration_seconds=15.0)
        await manager.disconnect(websocket, session_id)
    except Exception:
        stream_id = _active_heygen_sessions.pop(session_id, None)
        if stream_id:
            await close_session(stream_id, duration_seconds=15.0)
        await manager.disconnect(websocket, session_id)

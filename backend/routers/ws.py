import asyncio
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.websocket_manager import manager
from services.news_engine import generate_news
from services.video_fetcher import search_video

router = APIRouter()


def make_message(msg_type: str, session_id: str, payload: dict) -> dict:
    return {
        "type": msg_type,
        "session_id": session_id,
        "timestamp": time.time(),
        "payload": payload,
    }


async def reset_to_idle(session_id: str, delay: float = 30.0):
    """After a delay, broadcast avatar state back to idle."""
    await asyncio.sleep(delay)
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

        # 4. Generate news
        news_data = await generate_news(text)

        # 5. Search for video
        video_data = await search_video(news_data["video_search_term"])

        # 6. Avatar → present
        await manager.broadcast_to_session(
            session_id,
            make_message("avatar_state_change", session_id, {"state": "present"}),
        )

        # 7. Broadcast news result
        await manager.broadcast_to_session(
            session_id,
            make_message("news_result", session_id, news_data),
        )

        # 8. Broadcast video result
        await manager.broadcast_to_session(
            session_id,
            make_message("video_result", session_id, video_data),
        )

        # 9. Schedule return to idle after 30 seconds
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
        await manager.disconnect(websocket, session_id)
    except Exception:
        await manager.disconnect(websocket, session_id)

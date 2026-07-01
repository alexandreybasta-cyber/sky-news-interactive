import httpx
import json
import os
import time
import edge_tts
from pathlib import Path
from config import settings

USAGE_FILE = Path(__file__).parent.parent / "data" / "heygen_usage.json"
AUDIO_DIR = "/tmp/skynews_audio"

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(USAGE_FILE.parent, exist_ok=True)


def _load_usage() -> dict:
    if USAGE_FILE.exists():
        with open(USAGE_FILE) as f:
            return json.load(f)
    return {"month": time.strftime("%Y-%m"), "total_seconds": 0}


def _save_usage(usage: dict):
    with open(USAGE_FILE, "w") as f:
        json.dump(usage, f, indent=2)


def check_budget() -> bool:
    """Returns True if budget is available."""
    usage = _load_usage()
    current_month = time.strftime("%Y-%m")
    if usage["month"] != current_month:
        # Reset for new month
        usage = {"month": current_month, "total_seconds": 0}
        _save_usage(usage)
    return usage["total_seconds"] < settings.HEYGEN_MONTHLY_BUDGET_SEC


def log_usage(seconds: float):
    """Log seconds used."""
    usage = _load_usage()
    current_month = time.strftime("%Y-%m")
    if usage["month"] != current_month:
        usage = {"month": current_month, "total_seconds": 0}
    usage["total_seconds"] += seconds
    _save_usage(usage)
    print(f"HeyGen usage: {seconds:.1f}s this interaction, {usage['total_seconds']:.1f}s/{settings.HEYGEN_MONTHLY_BUDGET_SEC}s monthly total")


async def create_session() -> dict | None:
    """
    Create a HeyGen Realtime avatar session.
    Returns {"stream_id": "...", "stream_url": "..."} or None on failure.
    """
    if not settings.HEYGEN_API_KEY or not settings.HEYGEN_AVATAR_ID:
        print("HeyGen: No API key or avatar ID configured, skipping")
        return None

    if not check_budget():
        print("HeyGen: Monthly budget exceeded, using fallback")
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Create session
            resp = await client.post(
                f"{settings.HEYGEN_BASE_URL}/v3/avatar-realtime",
                headers={
                    "X-Api-Key": settings.HEYGEN_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "avatar_id": settings.HEYGEN_AVATAR_ID,
                    "voice_id": settings.HEYGEN_VOICE_ID,
                    "type": "text_stream",
                    "quality": 720,
                },
            )

            if resp.status_code != 200:
                print(f"HeyGen: Session creation failed ({resp.status_code}): {resp.text}")
                return None

            data = resp.json()
            stream_id = data.get("data", {}).get("stream_id") or data.get("stream_id")

            if not stream_id:
                print(f"HeyGen: No stream_id in response: {data}")
                return None

            # Get stream URL
            resp2 = await client.get(
                f"{settings.HEYGEN_BASE_URL}/v3/avatar-realtime/{stream_id}",
                headers={"X-Api-Key": settings.HEYGEN_API_KEY},
            )

            if resp2.status_code != 200:
                print(f"HeyGen: Get stream URL failed ({resp2.status_code})")
                return None

            stream_data = resp2.json()
            stream_url = (
                stream_data.get("data", {}).get("url")
                or stream_data.get("data", {}).get("stream_url")
                or stream_data.get("url")
            )

            return {"stream_id": stream_id, "stream_url": stream_url}

    except Exception as e:
        print(f"HeyGen: Error creating session: {e}")
        return None


async def send_text(stream_id: str, text: str) -> bool:
    """Send text to the avatar to speak with lip-sync."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.HEYGEN_BASE_URL}/v3/avatar-realtime/{stream_id}/text",
                headers={
                    "X-Api-Key": settings.HEYGEN_API_KEY,
                    "Content-Type": "application/json",
                },
                json={"text": text},
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"HeyGen: Error sending text: {e}")
        return False


async def close_session(stream_id: str, duration_seconds: float = 15.0):
    """Close a HeyGen session and log usage."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.delete(
                f"{settings.HEYGEN_BASE_URL}/v3/avatar-realtime/{stream_id}",
                headers={"X-Api-Key": settings.HEYGEN_API_KEY},
            )
        log_usage(duration_seconds)
    except Exception as e:
        print(f"HeyGen: Error closing session: {e}")
        log_usage(duration_seconds)  # Still log the usage


async def generate_fallback_audio(text: str) -> str:
    """
    Use Edge TTS (free Microsoft TTS) to generate speech audio.
    Returns the file path of the generated audio.
    """
    filename = f"speech_{int(time.time())}.mp3"
    output_path = os.path.join(AUDIO_DIR, filename)

    try:
        communicate = edge_tts.Communicate(text, "en-GB-SoniaNeural")
        await communicate.save(output_path)
        return filename  # Return just filename, served via /api/audio/{filename}
    except Exception as e:
        print(f"Edge TTS: Error generating audio: {e}")
        return ""

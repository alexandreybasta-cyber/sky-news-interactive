import sys
import os

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import ws, news

AUDIO_DIR = "/tmp/skynews_audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

app = FastAPI(title="Sky News Interactive Display", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws.router)
app.include_router(news.router, prefix="/api")
app.mount("/api/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

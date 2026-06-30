from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class AvatarState(str, Enum):
    IDLE = "idle"
    LISTEN = "listen"
    THINK = "think"
    PRESENT = "present"


class NewsRequest(BaseModel):
    query: str
    context: Optional[str] = None


class NewsResponse(BaseModel):
    headline: str
    summary: str
    key_facts: List[str]
    video_search_term: str
    sources: List[str]
    confidence: float


class VideoResult(BaseModel):
    video_url: str
    video_id: str
    thumbnail: str
    title: str


class WSMessage(BaseModel):
    type: str
    session_id: str
    timestamp: float
    payload: dict

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    DASHSCOPE_API_KEY: str = ""
    DASHSCOPE_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    MODEL_TEXT: str = "qwen-max"
    BASE_URL: str = "http://localhost:8000"
    WS_URL: str = "ws://localhost:8000"

    # HeyGen Avatar API
    HEYGEN_API_KEY: str = ""
    HEYGEN_AVATAR_ID: str = ""
    HEYGEN_VOICE_ID: str = ""
    HEYGEN_BASE_URL: str = "https://api.heygen.com"
    HEYGEN_MONTHLY_BUDGET_SEC: int = 200

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

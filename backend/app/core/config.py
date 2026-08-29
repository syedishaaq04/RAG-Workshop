import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Walk up from this file to find the backend/.env regardless of CWD
_THIS_DIR = Path(__file__).resolve().parent          # backend/app/core/
_BACKEND_DIR = _THIS_DIR.parent.parent               # backend/
_ENV_FILE = _BACKEND_DIR / ".env"

class Settings(BaseSettings):
    MONGODB_URI: str
    JWT_SECRET_KEY: str
    GROQ_API_KEY: str
    GEMINI_API_KEY: str
    CORS_ORIGINS: list[str] | str = ["*"]
    RAG_AGENT_MODEL: str = "openai/gpt-oss-120b"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    @property
    def parsed_cors_origins(self) -> list[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()

from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    """Settings - только параметры окружения, не логика приложения."""
    
    # === СЕРВЕР ===
    RAG_HOST: str = os.getenv("RAG_HOST", "127.0.0.1")
    RAG_PORT: int = int(os.getenv("RAG_PORT", "8001"))
    
    # === BACKEND ===
    RAG_BACKEND_URL: str = os.getenv("RAG_BACKEND_URL", "http://localhost:8000")
    RAG_CALLBACK_SECRET: str = os.getenv("RAG_CALLBACK_SECRET", "")
    RAG_SERVICE_TOKEN: str = os.getenv("RAG_SERVICE_TOKEN", "")  # Токен для проверки Backend requests
    
    # === LLM (только окружение, НЕ параметры модели) ===
    LLM_TYPE: str = os.getenv("LLM_TYPE", "ollama")  # ollama, openai, anthropic, huggingface
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "http://localhost:11434")  # без /v1
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "ollama")
    
    # === ВЕКТОР БД ===
    VECTORDB_PATH: str = os.getenv("VECTORDB_PATH", "./vectordb")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

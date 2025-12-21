from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change_me")
    # Указываем дефолтный алгоритм подписи токенов
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

    # Дополнительные переменные, используемые в проекте
    RAG_URL: str = os.getenv("RAG_URL", "http://localhost:8001")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        # допускаем дополнительные переменные в окружении
        extra = "ignore"


settings = Settings()

from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    
    # === БД ===
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./hr_guardian.db")
    
    # === JWT ===
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change_me_in_production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    
    # === RAG ===
    RAG_URL: str = os.getenv("RAG_URL", "http://localhost:8001")
    RAG_CALLBACK_SECRET: str = os.getenv("RAG_CALLBACK_SECRET", "")
    
    # === ЛОГИРОВАНИЕ ===
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


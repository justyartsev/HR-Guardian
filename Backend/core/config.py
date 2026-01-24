from pathlib import Path
import os

# Для локальной разработки загружаем .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # В Docker dotenv не нужен

# Корень Backend (где лежит main.py)
BACKEND_ROOT = Path(__file__).parent.parent


class Settings:
    """Настройки приложения. Работает одинаково локально и в Docker."""
    
    def __init__(self):
        # === БД ===
        self.DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hr_guardian.db")
        
        # === JWT ===
        self.SECRET_KEY = os.getenv("SECRET_KEY", "change_me_in_production")
        self.ALGORITHM = os.getenv("ALGORITHM", "HS256")
        
        # === RAG ===
        self.RAG_URL = os.getenv("RAG_URL", "http://localhost:9000")
        self.RAG_CALLBACK_SECRET = os.getenv("RAG_CALLBACK_SECRET", "")
        self.RAG_SERVICE_TOKEN = os.getenv("RAG_SERVICE_TOKEN", "")
        
        # === ФАЙЛЫ ===
        self.FILES_ROOT = str(BACKEND_ROOT / "files" / "documents")
        
        # === ЛОГИРОВАНИЕ ===
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()


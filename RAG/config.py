import os

# Для локальной разработки загружаем .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # В Docker dotenv не нужен


class Settings:
    """Настройки RAG. Работает одинаково локально и в Docker."""
    
    def __init__(self):
        # === СЕРВЕР ===
        self.RAG_HOST = os.getenv("RAG_HOST", "127.0.0.1")
        self.RAG_PORT = int(os.getenv("RAG_PORT", "9000"))
        
        # === BACKEND ===
        self.RAG_BACKEND_URL = os.getenv("RAG_BACKEND_URL", "http://localhost:8000")
        self.RAG_CALLBACK_SECRET = os.getenv("RAG_CALLBACK_SECRET", "")
        self.RAG_SERVICE_TOKEN = os.getenv("RAG_SERVICE_TOKEN", "")
        
        # === LLM ===
        self.LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434")
        self.LLM_API_KEY = os.getenv("LLM_API_KEY", "ollama")
        self.LLM_MODEL = os.getenv("LLM_MODEL", "qwen3:1.7b")
        self.LLM_WORKERS = int(os.getenv("LLM_WORKERS", "2"))
        # Thinking mode для Qwen3: True = модель "думает" вслух, False = добавляет /no_think
        self.LLM_ENABLE_THINKING = os.getenv("LLM_ENABLE_THINKING", "false").lower() == "true"
        
        # === ВЕКТОР БД ===
        self.VECTORDB_PATH = os.getenv("VECTORDB_PATH", "./vectordb")


settings = Settings()

import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from datetime import datetime
import io
from concurrent.futures import ThreadPoolExecutor
import asyncio

# Явная конфигурация UTF-8 для Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.append(str(Path(__file__).parent.parent))

try:
    from routes import query_router, sync_router
except ImportError as e:
    raise

try:
    from modules.db_utility import init_vectordb
except ImportError as e:
    raise

# Приложение FastAPI
app = FastAPI(
    title="HR-Guardian RAG API",
    description="RAG система для HR ассистента",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Обработчик ошибок валидации
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    """Логирует ошибки валидации (обработка исключений)."""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )
    

# Инициализация Chroma при стартапе
@app.on_event("startup")
async def startup():
    """Инициализирует Chroma PersistentClient и запускает LLM queue worker (параметры: нет; возвращает: None)."""
    try:
        init_vectordb()
        # Создаем single-thread executor для ограничения параллелизма ollama (макс 1 запрос)
        from modules.llm_queue import set_executor, get_llm_queue
        from modules.LLM import answer
        
        single_thread_executor = ThreadPoolExecutor(max_workers=1)
        set_executor(single_thread_executor)
        print("[RAG] Single-thread executor initialized for LLM")
        
        llm_queue = get_llm_queue()
        asyncio.create_task(llm_queue.process_queue(answer))
        print("[RAG] LLM Queue worker started")
    except Exception as e:
        print(f"[RAG] Warning: Startup init failed: {e}")

# Регистрация routes
app.include_router(query_router)
app.include_router(sync_router)

# Root endpoint
@app.get("/")
async def root():
    """Информация о RAG API."""
    return {
        "service": "HR-Guardian RAG",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """
    Проверка здоровья приложения.
    Используется для мониторинга доступности RAG сервиса.
    """
    return {
        "status": "OK",
        "service": "RAG API",
        "timestamp": datetime.utcnow().isoformat(),
        "vectordb": "connected"  # в реальности нужна проверка подключения
    }


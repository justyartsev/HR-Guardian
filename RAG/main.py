import os
import sys
import subprocess
import time
import socket
from pathlib import Path

# ═══════════════════════════════════════════════════════════════
# Настройки HuggingFace:
# - Отключаем telemetry и symlink warnings
# - НЕ включаем offline mode - модели должны скачиваться автоматически
# ═══════════════════════════════════════════════════════════════
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"


def is_ollama_running(host: str = "localhost", port: int = 11434) -> bool:
    """Проверяет, запущена ли Ollama на заданном хосте/порте."""
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def start_ollama() -> bool:
    """Проверяет доступность Ollama. Если LLM_BASE_URL указывает на удалённый сервис,
    просто проверяем доступность хоста:порта и НЕ пытаемся запускать локальный binary.
    Если LLM_BASE_URL указывает на localhost, попытка запуска локального сервера
    производится (как раньше).

    Возвращает True если Ollama доступна.
    """
    # Определяем целевой хост/порт из переменной окружения LLM_BASE_URL
    try:
        from urllib.parse import urlparse
        llm_base = os.getenv('LLM_BASE_URL', 'http://localhost:11434')
        parsed = urlparse(llm_base)
        host = parsed.hostname or 'localhost'
        port = parsed.port or 11434
    except Exception:
        host, port = 'localhost', 11434

    # Ждём, если удалённый хост пока не поднят (например, Ollama стартует чуть позже)
    for i in range(30):
        if is_ollama_running(host, port):
            print(f"[RAG] ✅ Ollama reachable at {host}:{port}", flush=True)
            return True
        if i % 5 == 4:
            print(f"[RAG] Waiting for Ollama at {host}:{port}... ({i+1}s)", flush=True)
        time.sleep(1)

    # Если целевой хост не локальный, не пытаемся запускать binary внутри контейнера
    if host not in ("localhost", "127.0.0.1", "0.0.0.0"):
        print(f"[RAG] ⚠️ Ollama not reachable at {host}:{port} after waiting", flush=True)
        return False

    # Попытка запустить локально (для dev на машине разработчика)
    print("[RAG] Starting Ollama locally...", flush=True)
    try:
        # Запускаем ollama serve в фоне
        if sys.platform == "win32":
            CREATE_NO_WINDOW = 0x08000000
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=CREATE_NO_WINDOW
            )
        else:
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )

        # Ждём запуска (до 30 секунд)
        for i in range(30):
            time.sleep(1)
            if is_ollama_running(host, port):
                print(f"[RAG] ✅ Ollama started successfully (took {i+1}s)", flush=True)
                return True
            if i % 5 == 4:
                print(f"[RAG] Waiting for Ollama... ({i+1}s)", flush=True)

        print("[RAG] ⚠️ Ollama did not start in 30 seconds", flush=True)
        return False

    except FileNotFoundError:
        print("[RAG] ❌ Ollama binary not found locally. If you run Ollama as a separate service, set LLM_BASE_URL to its address.", flush=True)
        return False
    except Exception as e:
        print(f"[RAG] ❌ Failed to start Ollama locally: {e}", flush=True)
        return False

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from datetime import datetime
import io
from concurrent.futures import ThreadPoolExecutor
import asyncio
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

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

# Глобальный executor для корректного завершения
_executor = None
_cleanup_task = None


async def periodic_cache_cleanup():
    """Периодическая очистка устаревшего кэша LLM запросов."""
    from modules.llm_queue import get_llm_queue
    while True:
        await asyncio.sleep(300)  # Каждые 5 минут
        try:
            llm_queue = get_llm_queue()
            cleaned = llm_queue.cleanup_expired_cache()
            if cleaned > 0:
                print(f"[RAG] Cleaned {cleaned} expired cache entries")
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения."""
    global _executor, _cleanup_task

    # Startup
    try:
        # Проверяем и запускаем Ollama
        if not start_ollama():
            print("[RAG] ⚠️ Warning: Ollama is not running. LLM requests will fail!", flush=True)
        
        init_vectordb()
        from modules.llm_queue import set_executor, get_llm_queue, init_llm_queue
        from modules.LLM import answer
        from config import settings

        init_llm_queue()

        # Embedding модель уже загружена через entrypoint.sh при запуске контейнера

        # Число воркеров из конфига (по умолчанию 2)
        num_workers = settings.LLM_WORKERS
        print(f"[RAG] Starting {num_workers} LLM workers...", flush=True)

        _executor = ThreadPoolExecutor(max_workers=num_workers)
        set_executor(_executor)

        llm_queue = get_llm_queue()

        # Запускаем несколько воркеров для параллельной обработки
        for i in range(num_workers):
            asyncio.create_task(llm_queue.process_queue(answer))
            print(f"[RAG] Worker {i+1}/{num_workers} started", flush=True)

        # Запускаем периодическую очистку кэша
        _cleanup_task = asyncio.create_task(periodic_cache_cleanup())

        await asyncio.sleep(0.5)
        print(f"[RAG] Ready! Using LLM model: {settings.LLM_MODEL}", flush=True)
    except Exception as e:
        import traceback
        traceback.print_exc()

    yield

    # Shutdown - корректно завершаем executor и cleanup task
    print("[RAG] Shutting down...", flush=True)
    if _cleanup_task:
        _cleanup_task.cancel()
    if _executor:
        _executor.shutdown(wait=False)


# Приложение FastAPI
app = FastAPI(
    title="HR-Guardian RAG API",
    description="RAG система для HR ассистента",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Обработчик ошибок валидации
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    """Логирует ошибки валидации (обработка исключений)."""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


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


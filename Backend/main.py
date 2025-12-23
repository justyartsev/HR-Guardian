from fastapi import FastAPI
from contextlib import asynccontextmanager
from database import engine, Base
from routes import auth, document, dialog, query, feedback
from core.scheduler import start_scheduler, stop_scheduler
import os
from pathlib import Path

# Создаём необходимые директории при старте приложения
def create_directories():
    dirs = [
        "./files/documents",  # директория для документов с версионированием
        "./logs"              # директория для логов
    ]
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)

# Создаём БД схему и инициализируем директории
Base.metadata.create_all(bind=engine)
create_directories()

# Lifespan event handlers (новый способ вместо @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()

app = FastAPI(title="HR-Guardian", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(document.router)
app.include_router(dialog.router)
app.include_router(query.router)
app.include_router(feedback.router)
from routes import rag_callback
app.include_router(rag_callback.router)


@app.get("/")
def root():
    return {"message": "HR Guardian API is running"}
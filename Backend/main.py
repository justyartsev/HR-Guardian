from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes import users
from database import engine, Base, create_default_hr_user
from routes import auth, document, dialog, query, feedback
from core.scheduler import start_scheduler, stop_scheduler
import os
from pathlib import Path

# Создаём необходимые директории при старте приложения
def create_directories():
    dirs = [
        "./files/documents",  # директория для документов с версионированием
    ]
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)



# Lifespan event handlers (новый способ вместо @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы в БД
    Base.metadata.create_all(bind=engine)
    # Создаём HR пользователя по умолчанию (если БД пустая)
    create_default_hr_user()
    # Создаём директории для файлов
    create_directories()
    # Startup
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()

app = FastAPI(title="HR-Guardian", lifespan=lifespan)

# CORS конфигурация для фронтенда
# В production установите CORS_ORIGINS в переменных окружения
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(document.router)
app.include_router(dialog.router)
app.include_router(query.router)
app.include_router(feedback.router)
app.include_router(users.router)
from routes import rag_callback, notifications
app.include_router(rag_callback.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {"message": "HR Guardian API is running"}


@app.get("/health")
def health():
    """Health check endpoint для Docker healthcheck"""
    return {"status": "healthy"}
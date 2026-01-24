from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings
import bcrypt
import os

DATABASE_URL = settings.DATABASE_URL

# Connection pooling для поддержки 10+ одновременных пользователей
engine = create_engine(
    DATABASE_URL,
    pool_size=20,           # Базовый пул соединений (достаточно для 10-15 пользователей)
    max_overflow=10,        # Дополнительные соединения при пиковой нагрузке
    pool_pre_ping=True,     # Проверка соединения перед использованием
    pool_recycle=3600,      # Переиспользование соединений каждый час
    echo=False              # Отключаем SQL логи в продакшене
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_default_hr_user():
    """Создаёт HR пользователя по умолчанию если таблица users пуста.

    Данные можно переопределить через переменные окружения:
    - DEFAULT_HR_EMAIL (по умолчанию: hr@company.local)
    - DEFAULT_HR_PASSWORD (по умолчанию: hr_admin_123)
    - DEFAULT_HR_USERNAME (по умолчанию: hr_admin)
    """
    from models.user import User
    from core.enums import UserRole, UserStatus
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        # Проверяем есть ли уже пользователи
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("[DB_INIT] Users table is not empty, skipping default HR creation")
            return

        # Данные для HR пользователя (можно переопределить через env)
        hr_email = os.getenv("DEFAULT_HR_EMAIL", "hr@company.local")
        hr_password = os.getenv("DEFAULT_HR_PASSWORD", "hr_admin_123")
        hr_username = os.getenv("DEFAULT_HR_USERNAME", "hr_admin")

        # Хэшируем пароль
        hashed_password = bcrypt.hashpw(hr_password.encode('utf-8'), bcrypt.gensalt())

        # Создаём HR пользователя
        hr_user = User(
            username=hr_username,
            email=hr_email,
            hashed_password=hashed_password.decode('utf-8'),
            first_name="HR",
            last_name="Администратор",
            position="HR Manager",
            department="Human Resources",
            role=UserRole.hr,
            status=UserStatus.approved,
            created_at=datetime.now(timezone.utc)
        )

        db.add(hr_user)
        db.commit()

        print(f"[DB_INIT] Created default HR user:")
        print(f"  Email: {hr_email}")
        print(f"  Username: {hr_username}")
        print(f"  Password: {hr_password}")
        print(f"  Role: HR")
        print(f"  Status: approved")

    except Exception as e:
        print(f"[DB_INIT] Error creating default HR user: {e}")
        db.rollback()
    finally:
        db.close()

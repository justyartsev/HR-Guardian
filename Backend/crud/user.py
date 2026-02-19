"""CRUD операции для пользователей"""

from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional

from models.user import User
from schemas.user import UserCreate, UserUpdate
from core.security import hash_password
from core.enums import UserRole, UserStatus


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Получить пользователя по email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Получить пользователя по username"""
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Получить пользователя по ID"""
    return db.query(User).filter(User.id == user_id).first()


def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[UserStatus] = None,
    role: Optional[UserRole] = None,
    include_rejected: bool = False
) -> List[User]:
    """Получить список пользователей с фильтрацией

    По умолчанию НЕ показывает rejected пользователей (для безопасности)
    """
    query = db.query(User)

    # По умолчанию исключаем rejected пользователей
    if not include_rejected:
        query = query.filter(User.status != UserStatus.rejected)

    if status:
        query = query.filter(User.status == status)
    if role:
        query = query.filter(User.role == role)

    return query.offset(skip).limit(limit).all()


def get_pending_users(db: Session) -> List[User]:
    """Получить пользователей ожидающих подтверждения"""
    return db.query(User).filter(User.status == UserStatus.pending).all()


def create_user(db: Session, user_data: UserCreate, role: UserRole = UserRole.employee) -> User:
    """Создать нового пользователя

    Args:
        db: Сессия БД
        user_data: Данные пользователя
        role: Роль (по умолчанию employee)

    Returns:
        Созданный пользователь
    """
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        position=user_data.position,
        department=user_data.department,
        role=role,
        status=UserStatus.pending,
        created_at=datetime.now(timezone.utc)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def update_user_profile(db: Session, user_id: int, update_data: UserUpdate) -> Optional[User]:
    """Обновить профиль пользователя (имя, должность и т.д.)"""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    if update_data.first_name is not None:
        user.first_name = update_data.first_name
    if update_data.last_name is not None:
        user.last_name = update_data.last_name
    if update_data.position is not None:
        user.position = update_data.position
    if update_data.department is not None:
        user.department = update_data.department

    db.commit()
    db.refresh(user)
    return user


def approve_user(db: Session, user_id: int) -> Optional[User]:
    """Подтвердить регистрацию пользователя"""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    user.status = UserStatus.approved
    db.commit()
    db.refresh(user)
    return user


def reject_user(db: Session, user_id: int) -> bool:
    """Отклонить регистрацию пользователя (удаляет из БД)"""
    user = get_user_by_id(db, user_id)
    if not user:
        return False

    # Отклонённые пользователи должны быть удалены из системы
    db.delete(user)
    db.commit()
    return True


def update_user_role(db: Session, user_id: int, new_role: UserRole) -> Optional[User]:
    """Изменить роль пользователя"""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    user.role = new_role
    db.commit()
    db.refresh(user)
    return user


def update_last_login(db: Session, user_id: int) -> Optional[User]:
    """Обновить время последнего входа"""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    """Удалить пользователя"""
    user = get_user_by_id(db, user_id)
    if not user:
        return False

    db.delete(user)
    db.commit()
    return True

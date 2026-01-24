from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from core.enums import UserRole, UserStatus


class LoginSchema(BaseModel):
    email: str  # Не используем EmailStr для логина - позволяем любой формат
    password: str
    remember_me: Optional[bool] = False  # Флаг "Запомнить меня" для продления сессии


class UserCreate(BaseModel):
    """Схема регистрации - роль всегда employee, статус pending"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str  # Не используем EmailStr - .local домены не проходят валидацию
    password: str = Field(..., min_length=6)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    position: Optional[str] = Field(None, max_length=100)  # Должность
    department: Optional[str] = Field(None, max_length=100)  # Отдел


class UserResponse(BaseModel):
    id: int
    username: str
    email: str  # Не используем EmailStr - .local домены не проходят валидацию
    first_name: Optional[str]
    last_name: Optional[str]
    position: Optional[str]
    department: Optional[str]
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    """Схема для обновления профиля пользователя"""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)


class UserApproval(BaseModel):
    """Схема для подтверждения/отклонения пользователя админом"""
    status: UserStatus  # approved или rejected
    role: Optional[UserRole] = None  # Можно сразу назначить роль при подтверждении
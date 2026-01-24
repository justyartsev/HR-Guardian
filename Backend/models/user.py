import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum, func
from database import Base
from core.enums import UserRole, UserStatus


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)  # Должность
    department = Column(String(100), nullable=True)  # Отдел
    role = Column(Enum(UserRole), default=UserRole.employee, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.pending, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime, nullable=True)


from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from core.enums import UserRole


class LoginSchema(BaseModel):
    email: EmailStr
    password: str
    
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.employee

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username:str
    password:str
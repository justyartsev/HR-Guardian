from jose import jwt
from datetime import datetime, timedelta, timezone
from .config import settings

def create_token(data: dict):
    to_encode = data.copy()
    # Используем UTC время для корректной работы expiry
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

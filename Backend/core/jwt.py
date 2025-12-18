from jose import jwt
from datetime import datetime, timedelta
from .config import settings

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(hours=24)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

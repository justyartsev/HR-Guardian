from jose import jwt
from datetime import datetime, timedelta, timezone
from .config import settings

def create_token(data: dict, expires_delta: timedelta = None):
    """Создать JWT токен с пользовательским сроком жизни.

    Args:
        data: Данные для кодирования в токен
        expires_delta: Срок жизни токена (по умолчанию 24 часа)
    """
    to_encode = data.copy()
    # Используем UTC время для корректной работы expiry
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str):
    """Декодировать JWT токен и вернуть payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.JWTClaimsError:
        raise ValueError("Invalid token claims")
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}")

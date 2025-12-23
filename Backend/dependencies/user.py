from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from core.config import settings
from database import get_db
from sqlalchemy.orm import Session
from models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        # Проверяем что user_id - это валидное число
        try:
            user_id_int = int(user_id)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid token: user ID format")

        user = db.query(User).get(user_id_int)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")


def require_role(*allowed_roles: str):
    """Dependency factory: проверяет роль текущего пользователя."""
    def _require(current_user = Depends(get_current_user)):
        if current_user.role.name not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return current_user
    return _require

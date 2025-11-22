from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from core.config import settings
from database import get_db
from sqlalchemy.orm import Session
from models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(User).get(int(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

from fastapi import APIRouter, Depends

from dependencies.user import get_current_user
from models.user import User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

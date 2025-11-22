from django.db import router
from fastapi import Depends

from dependencies.user import get_current_user
from models import User


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

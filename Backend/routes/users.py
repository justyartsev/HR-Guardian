from fastapi import APIRouter, Depends

from dependencies.user import get_current_user
from models.user import User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies.user import get_current_user
from dependencies.user import promote_user_to_hr

router = APIRouter(prefix="/users", tags=["users"])

@router.patch("/{user_id}/promote-to-hr")
def promote_to_hr(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = promote_user_to_hr(user_id, db)
    return {
        "message": "User promoted to HR",
        "user_id": user.id,
        "new_role": user.role
    }

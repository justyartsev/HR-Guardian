from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies.user import get_current_user
from models.user import User
from schemas.user import UserUpdate, UserResponse
from core.enums import UserRole
import crud.user as user_crud

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновление профиля текущего пользователя (имя, фамилия, должность, отдел)"""
    updated_user = user_crud.update_user_profile(db, current_user.id, update_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user


@router.patch("/{user_id}/promote-to-hr")
def promote_to_hr(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Повысить пользователя до роли HR (только для HR/admin)"""
    if current_user.role not in [UserRole.hr, UserRole.admin]:
        raise HTTPException(
            status_code=403,
            detail="Only HR or admin can promote users"
        )

    user = user_crud.update_user_role(db, user_id, UserRole.hr)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "message": "User promoted to HR",
        "user_id": user.id,
        "new_role": user.role.value
    }
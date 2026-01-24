from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from core.jwt import create_token
from core.security import verify_password
from core.enums import UserRole, UserStatus
from dependencies.user import get_current_user, require_role
from models.user import User
from schemas.user import UserCreate, UserResponse, LoginSchema, UserApproval
from database import get_db
from core.notifications import notification_manager
import crud.user as user_crud

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
async def register(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Регистрация нового пользователя.

    Пользователь создаётся со статусом 'pending' и ролью 'employee'.
    Для входа в систему требуется подтверждение администратором.
    """
    # Валидация входных данных
    if len(user.username) < 3 or len(user.username) > 50:
        raise HTTPException(status_code=400, detail="Username must be 3-50 characters")
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if '@' not in user.email or len(user.email) > 254:
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Проверка уникальности через CRUD
    if user_crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if user_crud.get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    # Создание пользователя через CRUD
    new_user = user_crud.create_user(db, user, role=UserRole.employee)

    # Отправляем уведомление всем HR о новой регистрации
    background_tasks.add_task(
        notification_manager.notify_new_registration,
        new_user.id,
        new_user.username
    )

    return new_user


@router.post("/login")
def login(form: LoginSchema, db: Session = Depends(get_db)):
    """Вход в систему.

    Только пользователи со статусом 'approved' могут войти.
    """
    if not form.email or not form.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    # Получение пользователя через CRUD
    user = user_crud.get_user_by_email(db, form.email)

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Проверяем статус пользователя
    if user.status == UserStatus.pending:
        raise HTTPException(
            status_code=403,
            detail="Ваша учётная запись ожидает подтверждения администратором"
        )
    if user.status == UserStatus.rejected:
        raise HTTPException(
            status_code=403,
            detail="Ваша учётная запись была отклонена. Обратитесь к администратору"
        )

    # Обновляем last_login через CRUD
    user_crud.update_last_login(db, user.id)

    # Определяем срок жизни токена (Remember Me: 30 дней, обычный: 1 день)
    expires_delta = timedelta(days=30) if form.remember_me else timedelta(days=1)

    # Создаем токен
    token = create_token({
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "position": user.position,
        "department": user.department,
        "role": user.role.value,
        "status": user.status.value
    }, expires_delta=expires_delta)

    return {"access_token": token, "token_type": "bearer"}


@router.get("/users/pending", response_model=List[UserResponse])
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('hr', 'admin'))
):
    """Получить список пользователей, ожидающих подтверждения (HR/admin)."""
    return user_crud.get_pending_users(db)


@router.get("/users/pending/count")
def get_pending_users_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('hr', 'admin'))
):
    """Получить количество пользователей, ожидающих подтверждения (HR/admin)."""
    pending = user_crud.get_pending_users(db)
    return {"pending_users": len(pending)}


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('hr', 'admin'))
):
    """Получить список всех пользователей (HR/admin)."""
    return user_crud.get_users(db)


@router.patch("/users/{user_id}/approve")
def approve_user_endpoint(
    user_id: int,
    approval: UserApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('hr', 'admin'))
):
    """Подтвердить или отклонить пользователя (HR/admin).

    При подтверждении можно сразу назначить роль (hr/admin).
    При отклонении пользователь удаляется из системы.
    """
    if approval.status not in [UserStatus.approved, UserStatus.rejected]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    # Подтверждение или отклонение через CRUD
    if approval.status == UserStatus.approved:
        user = user_crud.approve_user(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        # Если указана роль - назначаем её
        if approval.role:
            user = user_crud.update_user_role(db, user_id, approval.role)
        return user
    else:
        # Отклонение - удаляем пользователя
        success = user_crud.reject_user(db, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User registration rejected and removed", "user_id": user_id}


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: int,
    role: UserRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('hr', 'admin'))
):
    """Изменить роль пользователя (HR/admin).

    Ограничения:
    - Нельзя менять роль самому себе
    - Только admin может понижать HR до employee
    """
    user = user_crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Нельзя менять роль самому себе
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя изменить свою роль")

    # Только admin может понижать HR
    if user.role == UserRole.hr and role == UserRole.employee:
        if current_user.role != UserRole.admin:
            raise HTTPException(
                status_code=403,
                detail="Только администратор может понижать HR"
            )

    # Изменение роли через CRUD
    updated_user = user_crud.update_user_role(db, user_id, role)
    return updated_user

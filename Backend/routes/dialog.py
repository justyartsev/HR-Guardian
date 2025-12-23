from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud.dialog as crud
import schemas.dialog as schemas
from models.user import User as UserModel
from dependencies.user import get_current_user

router = APIRouter(prefix="/dialogs", tags=["Dialogs"])

# Диалоги — контейнеры для сообщений пользователя и бота

@router.post("/", response_model=schemas.Dialog)
def create_dialog(
    dialog: schemas.DialogCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Создать новый диалог для текущего пользователя"""
    # Явно устанавливаем user_id текущему пользователю
    dialog.user_id = current_user.id
    return crud.create_dialog(db, dialog)


@router.get("/user/me", response_model=list[schemas.Dialog])
def get_my_dialogs(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить все диалоги текущего пользователя"""
    return crud.get_user_dialogs(db, current_user.id)


@router.get("/{dialog_id}", response_model=schemas.Dialog)
def get_dialog(
    dialog_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить диалог со всеми сообщениями"""
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # проверяем что диалог принадлежит пользователю
    if dialog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: this dialog belongs to another user")
    
    return dialog


@router.delete("/{dialog_id}")
def delete_dialog(
    dialog_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Удалить диалог со всеми сообщениями"""
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")

    if dialog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: this dialog belongs to another user")
    
    crud.delete_dialog(db, dialog_id)
    return {"status": "deleted"}


@router.patch("/{dialog_id}", response_model=schemas.Dialog)
def update_dialog(
    dialog_id: int,
    update_data: schemas.DialogUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Обновить название диалога (передать JSON с полем 'title')"""
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")

    if dialog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: this dialog belongs to another user")
    
    dialog = crud.update_dialog_title(db, dialog_id, update_data.title)
    return dialog


@router.post("/{dialog_id}/messages", response_model=schemas.Message)
def add_message(
    dialog_id: int,
    message: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Добавить сообщение в диалог"""
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    if dialog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: this dialog belongs to another user")
    
    return crud.add_message(db, dialog_id, message)


@router.get("/{dialog_id}/messages", response_model=list[schemas.Message])
def get_messages(
    dialog_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить последние N сообщений (в хронологическом порядке)"""
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    if dialog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: this dialog belongs to another user")
    
    messages = crud.get_messages(db, dialog_id, limit)
    return list(reversed(messages))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud.dialog as crud
import schemas.dialog as schemas
from models.user import User as UserModel
from dependencies.user import get_current_user, check_resource_ownership

router = APIRouter(prefix="/dialogs", tags=["Dialogs"])


def get_dialog_or_404(db: Session, dialog_id: int, current_user: UserModel):
    """Получить диалог или выбросить 404. Проверяет права доступа."""
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    check_resource_ownership(dialog.user_id, current_user)
    return dialog


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
    return get_dialog_or_404(db, dialog_id, current_user)


@router.delete("/{dialog_id}")
def delete_dialog(
    dialog_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Удалить диалог со всеми сообщениями"""
    get_dialog_or_404(db, dialog_id, current_user)
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
    get_dialog_or_404(db, dialog_id, current_user)
    return crud.update_dialog_title(db, dialog_id, update_data.title)


@router.post("/{dialog_id}/messages", response_model=schemas.Message)
def add_message(
    dialog_id: int,
    message: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Добавить сообщение в диалог"""
    print(f"[ADD_MESSAGE] dialog_id={dialog_id}, user_id={current_user.id}")
    print(f"[ADD_MESSAGE] message role={message.role}, content_length={len(message.content)}")
    print(f"[ADD_MESSAGE] sources={message.sources}")
    get_dialog_or_404(db, dialog_id, current_user)
    return crud.add_message(db, dialog_id, message)


@router.get("/{dialog_id}/messages", response_model=list[schemas.Message])
def get_messages(
    dialog_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить последние N сообщений (в хронологическом порядке)"""
    get_dialog_or_404(db, dialog_id, current_user)
    messages = crud.get_messages(db, dialog_id, limit)
    return list(reversed(messages))


@router.patch("/messages/{message_id}", response_model=schemas.Message)
def update_message(
    message_id: int,
    update_data: schemas.MessageUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Обновить содержимое сообщения (для редактирования)"""
    message = crud.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Проверяем права доступа через диалог
    dialog = crud.get_dialog(db, message.dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    check_resource_ownership(dialog.user_id, current_user)
    
    # Удаляем все сообщения после редактируемого
    crud.delete_messages_after(db, message.dialog_id, message_id)
    
    # Обновляем сообщение
    return crud.update_message(db, message_id, update_data.content)

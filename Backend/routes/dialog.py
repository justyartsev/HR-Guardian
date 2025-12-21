from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud.dialog as crud
import schemas.dialog as schemas

router = APIRouter(prefix="/dialogs", tags=["Dialogs"])

# Диалоги — контейнеры для сообщений пользователя и бота

@router.post("/", response_model=schemas.Dialog)
def create_dialog(dialog: schemas.DialogCreate, db: Session = Depends(get_db)):
    """Создать новый диалог для пользователя."""
    return crud.create_dialog(db, dialog)


@router.get("/{dialog_id}", response_model=schemas.Dialog)
def get_dialog(dialog_id: int, db: Session = Depends(get_db)):
    """Получить диалог со всеми сообщениями."""
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return dialog


@router.get("/user/{user_id}", response_model=list[schemas.Dialog])
def get_user_dialogs(user_id: int, db: Session = Depends(get_db)):
    """Получить все диалоги пользователя."""
    return crud.get_user_dialogs(db, user_id)


@router.delete("/{dialog_id}")
def delete_dialog(dialog_id: int, db: Session = Depends(get_db)):
    """Удалить диалог со всеми сообщениями."""
    dialog = crud.delete_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return {"status": "deleted"}


@router.patch("/{dialog_id}/title")
def update_dialog_title(dialog_id: int, title: str, db: Session = Depends(get_db)):
    """Обновить заголовок диалога."""
    dialog = crud.update_dialog_title(db, dialog_id, title)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return dialog


@router.post("/{dialog_id}/messages", response_model=schemas.Message)
def add_message(dialog_id: int, message: schemas.MessageCreate, db: Session = Depends(get_db)):
    """Добавить сообщение в диалог."""
    if not crud.get_dialog(db, dialog_id):
        raise HTTPException(status_code=404, detail="Dialog not found")
    return crud.add_message(db, dialog_id, message)


@router.get("/{dialog_id}/messages", response_model=list[schemas.Message])
def get_messages(dialog_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """Получить последние N сообщений (в хронологическом порядке)."""
    if not crud.get_dialog(db, dialog_id):
        raise HTTPException(status_code=404, detail="Dialog not found")
    messages = crud.get_messages(db, dialog_id, limit)
    return list(reversed(messages))

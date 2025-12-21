from sqlalchemy.orm import Session
from models.dialog import Dialog, Message
import schemas.dialog as schemas
from typing import Optional, List


def create_dialog(db: Session, dialog: schemas.DialogCreate):
    # Создание нового диалога
    db_dialog = Dialog(**dialog.dict())
    db.add(db_dialog)
    db.commit()
    db.refresh(db_dialog)
    return db_dialog


def get_dialog(db: Session, dialog_id: int):
    # Получение диалога по ID
    return db.query(Dialog).filter(Dialog.id == dialog_id).first()


def get_user_dialogs(db: Session, user_id: int):
    # Получение всех диалогов пользователя
    return db.query(Dialog).filter(Dialog.user_id == user_id).all()


def delete_dialog(db: Session, dialog_id: int):
    # Удаление диалога (каскадно удаляет все сообщения)
    dialog = get_dialog(db, dialog_id)
    if dialog:
        db.delete(dialog)
        db.commit()
    return dialog


def add_message(db: Session, dialog_id: int, message: schemas.MessageCreate):
    # Добавление сообщения в диалог
    msg_data = message.dict()
    db_msg = Message(dialog_id=dialog_id, **msg_data)
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg


def get_messages(db: Session, dialog_id: int, limit: int = 10):
    # Получение последних сообщений из диалога (по умолчанию 10)
    return db.query(Message).filter(
        Message.dialog_id == dialog_id
    ).order_by(Message.created_at.desc()).limit(limit).all()


def update_dialog_title(db: Session, dialog_id: int, new_title: str):
    # Обновление названия диалога
    dialog = get_dialog(db, dialog_id)
    if dialog:
        dialog.title = new_title
        db.commit()
        db.refresh(dialog)
    return dialog

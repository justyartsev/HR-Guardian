from sqlalchemy.orm import Session
from models.dialog import Dialog, Message
from models.feedback import QueryFeedback
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
    # Удаление диалога
    dialog = get_dialog(db, dialog_id)
    if dialog:
        # Обнуляем ссылки на диалог в feedbacks (жалобы сохраняются для HR)
        db.query(QueryFeedback).filter(
            QueryFeedback.dialog_id == dialog_id
        ).update({"dialog_id": None}, synchronize_session=False)

        # Обнуляем ссылки на сообщения этого диалога в feedbacks
        message_ids = [m.id for m in db.query(Message.id).filter(Message.dialog_id == dialog_id).all()]
        if message_ids:
            db.query(QueryFeedback).filter(
                QueryFeedback.message_id.in_(message_ids)
            ).update({"message_id": None}, synchronize_session=False)

        # Теперь можно удалить диалог (каскадно удалит сообщения)
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


def get_message(db: Session, message_id: int):
    # Получение сообщения по ID
    return db.query(Message).filter(Message.id == message_id).first()


def update_message(db: Session, message_id: int, content: str):
    # Обновление содержимого сообщения
    message = get_message(db, message_id)
    if message:
        message.content = content
        db.commit()
        db.refresh(message)
    return message


def delete_messages_after(db: Session, dialog_id: int, message_id: int):
    # Удаляет все сообщения после указанного (для редактирования истории)
    message = get_message(db, message_id)
    if not message:
        return 0

    # Получаем ID сообщений которые будут удалены
    messages_to_delete = db.query(Message.id).filter(
        Message.dialog_id == dialog_id,
        Message.id > message_id
    ).all()
    message_ids = [m.id for m in messages_to_delete]

    if not message_ids:
        return 0

    # СНАЧАЛА обнуляем ссылки на эти сообщения в feedbacks (чтобы сохранить жалобы для HR)
    db.query(QueryFeedback).filter(
        QueryFeedback.message_id.in_(message_ids)
    ).update({"message_id": None}, synchronize_session=False)

    # ПОТОМ удаляем сообщения
    deleted = db.query(Message).filter(
        Message.dialog_id == dialog_id,
        Message.id > message_id
    ).delete(synchronize_session=False)
    db.commit()
    return deleted

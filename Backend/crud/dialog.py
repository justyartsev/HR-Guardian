from sqlalchemy.orm import Session
from models.dialog import Dialog, Message
import schemas.dialog as schemas


def create_dialog(db: Session, dialog: schemas.DialogCreate):
    db_dialog = Dialog(**dialog.dict())
    db.add(db_dialog)
    db.commit()
    db.refresh(db_dialog)
    return db_dialog


def get_dialog(db: Session, dialog_id: int):
    return db.query(Dialog).filter(Dialog.id == dialog_id).first()


def get_user_dialogs(db: Session, user_id: int):
    return db.query(Dialog).filter(Dialog.user_id == user_id).all()


def delete_dialog(db: Session, dialog_id: int):
    dialog = get_dialog(db, dialog_id)
    if dialog:
        db.delete(dialog)
        db.commit()
    return dialog


def add_message(db: Session, dialog_id: int, message: schemas.MessageCreate):
    db_msg = Message(dialog_id=dialog_id, **message.model_dump())
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg


def get_messages(db: Session, dialog_id: int):
    return db.query(Message).filter(Message.dialog_id == dialog_id).all()

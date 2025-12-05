from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud.dialog as crud
import schemas.dialog as schemas

router = APIRouter(prefix="/dialogs", tags=["Dialogs"])


@router.post("/", response_model=schemas.Dialog)
def create_dialog(dialog: schemas.DialogCreate, db: Session = Depends(get_db)):
    return crud.create_dialog(db, dialog)


@router.get("/{dialog_id}", response_model=schemas.Dialog)
def get_dialog(dialog_id: int, db: Session = Depends(get_db)):
    dialog = crud.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return dialog


@router.get("/user/{user_id}", response_model=list[schemas.Dialog])
def get_user_dialogs(user_id: int, db: Session = Depends(get_db)):
    return crud.get_user_dialogs(db, user_id)


@router.delete("/{dialog_id}")
def delete_dialog(dialog_id: int, db: Session = Depends(get_db)):
    dialog = crud.delete_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    return {"status": "deleted"}


@router.post("/{dialog_id}/messages", response_model=schemas.Message)
def add_message(dialog_id: int, message: schemas.MessageCreate, db: Session = Depends(get_db)):
    if not crud.get_dialog(db, dialog_id):
        raise HTTPException(status_code=404, detail="Dialog not found")
    return crud.add_message(db, dialog_id, message)


@router.get("/{dialog_id}/messages", response_model=list[schemas.Message])
def get_messages(dialog_id: int, db: Session = Depends(get_db)):
    if not crud.get_dialog(db, dialog_id):
        raise HTTPException(status_code=404, detail="Dialog not found")
    return crud.get_messages(db, dialog_id)

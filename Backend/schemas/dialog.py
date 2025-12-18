from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class MessageBase(BaseModel):
    sender: str
    text: str


class MessageCreate(MessageBase):
    pass


class Message(MessageBase):
    id: int
    dialog_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class DialogBase(BaseModel):
    user_id: int
    title: Optional[str] = None


class DialogCreate(DialogBase):
    pass


class Dialog(DialogBase):
    id: int
    created_at: datetime
    messages: List[Message] = []

    class Config:
        from_attributes = True

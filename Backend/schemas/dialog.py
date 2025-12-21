from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


# Модель источника (документ, на который ссылается ответ)
class SourceReference(BaseModel):
    document_id: int
    version_id: int
    chunk_index: int


class MessageBase(BaseModel):
    sender: str
    text: str


class MessageCreate(MessageBase):
    # источники могут быть опциональны при создании
    sources: Optional[List[SourceReference]] = None


class Message(MessageBase):
    id: int
    dialog_id: int
    # источники документов, использованные для ответа
    sources: Optional[List[SourceReference]] = None
    created_at: datetime

    class Config:
        from_attributes = True


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

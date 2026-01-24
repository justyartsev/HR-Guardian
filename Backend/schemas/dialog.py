from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


# Модель источника (документ, на который ссылается ответ)
class SourceReference(BaseModel):
    document_id: int
    version_id: int = 0
    chunk_index: int = 0
    title: Optional[str] = None  # Название документа для отображения


class MessageBase(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str


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
    title: Optional[str] = None


class DialogCreate(DialogBase):
    user_id: Optional[int] = None  # устанавливается сервером автоматически


class DialogUpdate(BaseModel):
    """Обновление диалога - JSON Body"""
    title: str  # обязательное поле при обновлении


class MessageUpdate(BaseModel):
    """Обновление сообщения - JSON Body"""
    content: str  # новое содержимое сообщения


class Dialog(DialogBase):
    id: int
    user_id: int  # возвращается в ответе
    created_at: datetime
    messages: List[Message] = []

    class Config:
        from_attributes = True

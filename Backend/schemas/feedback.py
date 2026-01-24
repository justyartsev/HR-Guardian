from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class QueryFeedbackCreate(BaseModel):
    """Схема для создания жалобы пользователем на ответ чат-бота.
    
    Содержит информацию о жалобе:
    - message_id: ID сообщения бота, на которое жалоба
    - dialog_id: ID диалога
    - rating: Оценка ответа (1-5)
    - comment: Комментарий пользователя (почему жалоба)
    """
    message_id: int             # ID сообщения бота
    dialog_id: int              # ID диалога
    rating: Optional[int] = None # Оценка 1-5
    comment: Optional[str] = None # Комментарий


class QueryFeedbackUpdate(BaseModel):
    """Схема для обновления статуса жалобы (HR-специалист)."""
    status: str  # new, acknowledged, resolved


class QueryFeedbackResponse(BaseModel):
    """Схема для просмотра жалобы в журнале (HR-специалист)."""
    row_number: Optional[int] = None
    id: int
    user_question: str
    bot_response: str
    rating: Optional[int] = None
    user_comment: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime
    dialog_id: Optional[int] = None
    message_id: Optional[int] = None
    status: str = "new"

    class Config:
        from_attributes = True

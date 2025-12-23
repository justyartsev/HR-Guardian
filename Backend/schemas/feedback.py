from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class QueryFeedbackCreate(BaseModel):
    """Схема для создания жалобы пользователем на ответ чат-бота.
    
    Содержит всю необходимую информацию для журнала жалоб:
    - user_question: Исходный вопрос пользователя
    - bot_response: Ответ чат-бота, который вызвал жалобу
    - user_comment: Комментарий пользователя (почему жалоба)
    """
    user_question: str          # Что пользователь спросил
    bot_response: str           # Какой ответ вызвал жалобу
    user_comment: Optional[str] = None  # Почему неправильный


class QueryFeedbackResponse(BaseModel):
    """Схема для просмотра жалобы в журнале (HR-специалист)."""
    id: int
    user_question: str
    bot_response: str
    user_comment: Optional[str]
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

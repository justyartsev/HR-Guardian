from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class QueryFeedback(Base):
    """Модель для хранения жалоб пользователей на ответы чат-бота (Журнал запросов)"""
    __tablename__ = "query_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    
    # вопрос, который задал пользователь
    user_question = Column(Text, nullable=False)
    
    # ответ, который дал чат-бот
    bot_response = Column(Text, nullable=False)
    
    # комментарий пользователя: почему ответ неправильный/неполный
    user_comment = Column(Text, nullable=True)
    
    # ID пользователя, подавшего жалобу
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # ID диалога, в котором был задан вопрос (для контекста)
    dialog_id = Column(Integer, ForeignKey("dialogs.id"), nullable=True)
    
    # ID сообщения в диалоге, на которое жалоба (для ссылки)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    
    # дата подачи жалобы
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # связи
    user = relationship("User", foreign_keys=[user_id])
    dialog = relationship("Dialog", foreign_keys=[dialog_id])
    # message связь опциональна, но может быть полезна

from sqlalchemy.orm import Session
from models.feedback import QueryFeedback
from schemas.feedback import QueryFeedbackCreate
from datetime import datetime


def create_feedback(db: Session, user_id: int, data: QueryFeedbackCreate) -> QueryFeedback:
    """Создать новую жалобу в журнал запросов.
    
    Параметры:
    - user_id: ID пользователя, подавшего жалобу
    - data: QueryFeedbackCreate(message_id, dialog_id, rating, comment)
    
    Заполняет user_question и bot_response из диалога/сообщения.
    Сохраняется в БД с автоматическим timestamp'ом.
    """
    # Получаем вопрос и ответ из сообщения если возможно
    user_question = ""
    bot_response = ""
    
    if data.message_id:
        from models.dialog import Message
        message = db.query(Message).filter(Message.id == data.message_id).first()
        if message:
            bot_response = message.content or ""
            # Ищем предыдущее сообщение от пользователя (role == 'user')
            if data.dialog_id:
                prev_message = db.query(Message).filter(
                    Message.dialog_id == data.dialog_id,
                    Message.id < data.message_id,
                    Message.role == 'user'
                ).order_by(Message.id.desc()).first()
                if prev_message:
                    user_question = prev_message.content or ""
    
    feedback = QueryFeedback(
        message_id=data.message_id,
        dialog_id=data.dialog_id,
        user_question=user_question,
        bot_response=bot_response,
        rating=data.rating,
        user_comment=data.comment,
        user_id=user_id,
        created_at=datetime.utcnow()
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def get_all_feedbacks(db: Session, limit: int = 100, offset: int = 0) -> list:
    """Получить все жалобы (для HR-специалиста) с пагинацией"""
    return db.query(QueryFeedback).order_by(QueryFeedback.created_at.desc()).limit(limit).offset(offset).all()


def get_feedback_by_id(db: Session, feedback_id: int) -> QueryFeedback:
    """Получить жалобу по ID"""
    return db.query(QueryFeedback).filter(QueryFeedback.id == feedback_id).first()


def delete_feedback(db: Session, feedback_id: int) -> bool:
    """Удалить жалобу (обработанную запись из журнала)"""
    feedback = db.query(QueryFeedback).filter(QueryFeedback.id == feedback_id).first()
    if not feedback:
        return False
    db.delete(feedback)
    db.commit()
    return True


def count_feedbacks(db: Session) -> int:
    """Получить общее количество жалоб"""
    return db.query(QueryFeedback).count()


def update_feedback_status(db: Session, feedback_id: int, status: str) -> QueryFeedback:
    """Обновить статус жалобы (new, acknowledged, resolved)"""
    feedback = db.query(QueryFeedback).filter(QueryFeedback.id == feedback_id).first()
    if not feedback:
        return None
    feedback.status = status
    db.commit()
    db.refresh(feedback)
    return feedback

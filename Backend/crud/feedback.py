from sqlalchemy.orm import Session
from models.feedback import QueryFeedback
from schemas.feedback import QueryFeedbackCreate
from datetime import datetime


def create_feedback(db: Session, user_id: int, data: QueryFeedbackCreate) -> QueryFeedback:
    """Создать новую жалобу в журнал запросов.
    
    Параметры:
    - user_id: ID пользователя, подавшего жалобу
    - data: QueryFeedbackCreate(user_question, bot_response, user_comment)
    
    Сохраняется в БД с автоматическим timestamp'ом.
    dialog_id и message_id остаются NULL (опционально).
    """
    feedback = QueryFeedback(
        user_question=data.user_question,
        bot_response=data.bot_response,
        user_comment=data.user_comment,
        user_id=user_id,
        dialog_id=None,      # Опционально 
        message_id=None,     # Опционально
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


def get_feedbacks_by_user(db: Session, user_id: int) -> list:
    """Получить все жалобы конкретного пользователя"""
    return db.query(QueryFeedback).filter(QueryFeedback.user_id == user_id).order_by(QueryFeedback.created_at.desc()).all()


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

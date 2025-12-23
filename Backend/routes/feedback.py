from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies.user import get_current_user, require_role
from models.user import User as UserModel
import crud.feedback as crud_feedback
from schemas.feedback import QueryFeedbackCreate, QueryFeedbackResponse
from typing import List, Optional

# Маршруты для работы с жалобами пользователей (Журнал запросов)
router = APIRouter(prefix="/feedbacks", tags=["Feedback (Query Log)"])


# Подать жалобу на ответ чат-бота (доступно для всех пользователей)
@router.post("/", response_model=QueryFeedbackResponse)
def submit_feedback(
    feedback_data: QueryFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Подать жалобу на ответ чат-бота.
    
    Записывает в журнал запросов:
    - user_question: Какой вопрос задал пользователь
    - bot_response: Какой ответ дала система (важно!)
    - user_comment: Почему ответ неправильный/неполный
    
    Возвращает: Полную информацию о записанной жалобе с ID и временем создания.
    """
    feedback = crud_feedback.create_feedback(db, current_user.id, feedback_data)
    return feedback


# Получить список всех жалоб (только для HR)
@router.get("/", response_model=List[QueryFeedbackResponse])
def get_all_feedbacks(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Список жалоб из журнала запросов (HR only)"""
    feedbacks = crud_feedback.get_all_feedbacks(db, limit=limit, offset=offset)
    return feedbacks


# Получить подробности жалобы по ID (только для HR)
@router.get("/{feedback_id}", response_model=QueryFeedbackResponse)
def get_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Получить подробную информацию о жалобе (HR only)"""
    feedback = crud_feedback.get_feedback_by_id(db, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return feedback


# Удалить обработанную жалобу (только для HR)
@router.delete("/{feedback_id}")
def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Удалить жалобу из журнала (HR only)"""
    ok = crud_feedback.delete_feedback(db, feedback_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"status": "deleted"}


# Получить статистику по жалобам (только для HR)
@router.get("/stats/count", response_model=dict)
def get_feedback_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Получить количество жалоб (HR only)"""
    count = crud_feedback.count_feedbacks(db)
    return {"total_feedbacks": count}

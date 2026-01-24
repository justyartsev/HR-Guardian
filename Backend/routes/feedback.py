from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from dependencies.user import get_current_user, require_role
from models.user import User as UserModel
import crud.feedback as crud_feedback
from schemas.feedback import QueryFeedbackCreate, QueryFeedbackResponse, QueryFeedbackUpdate
from typing import List, Optional
from core.notifications import notification_manager

# Маршруты для работы с жалобами пользователей (Журнал запросов)
router = APIRouter(prefix="/feedback", tags=["Feedback (Query Log)"])


# Подать жалобу на ответ чат-бота (доступно для всех пользователей)
@router.post("/", response_model=QueryFeedbackResponse)
async def submit_feedback(
    feedback_data: QueryFeedbackCreate,
    background_tasks: BackgroundTasks,
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

    # Отправляем уведомление всем HR в фоне
    user_name = _format_user_name(current_user)
    background_tasks.add_task(
        notification_manager.notify_new_feedback,
        feedback.id,
        user_name
    )

    return feedback


# Получить статистику по жалобам (только для HR)
@router.get("/stats/count", response_model=dict)
def get_feedback_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Получить количество жалоб (HR only)"""
    count = crud_feedback.count_feedbacks(db)
    return {"total_feedbacks": count}


# Вспомогательная функция для форматирования имени пользователя
def _format_user_name(user) -> str:
    if user:
        if user.last_name and user.first_name:
            return f"{user.last_name} {user.first_name}"
        elif user.first_name:
            return user.first_name
        elif user.last_name:
            return user.last_name
        return user.username
    return "Неизвестный"


# Получить список всех жалоб (только для HR)
@router.get("/", response_model=List[QueryFeedbackResponse])
def get_all_feedbacks(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Список жалоб из журнала (HR only)"""
    feedbacks = crud_feedback.get_all_feedbacks(db, limit=limit, offset=offset)

    result = []
    for idx, feedback in enumerate(feedbacks, start=offset + 1):
        response = QueryFeedbackResponse.from_orm(feedback)
        response.row_number = idx
        response.user_name = _format_user_name(feedback.user)
        result.append(response)

    return result


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


# Обновить статус жалобы (только для HR)
@router.patch("/{feedback_id}", response_model=QueryFeedbackResponse)
def update_feedback(
    feedback_id: int,
    data: QueryFeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Обновить статус жалобы (HR only)

    Допустимые статусы: new, acknowledged, resolved
    """
    if data.status not in ['new', 'acknowledged', 'resolved']:
        raise HTTPException(status_code=400, detail="Invalid status. Use: new, acknowledged, resolved")
    feedback = crud_feedback.update_feedback_status(db, feedback_id, data.status)
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

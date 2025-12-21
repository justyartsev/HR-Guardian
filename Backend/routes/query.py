from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
import crud.dialog as crud_dialog
import schemas.dialog as schemas_dialog
import requests
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from core.config import settings


def sanitize_personal_data(personal: Optional[dict]) -> Optional[dict]:
    """Оставляет в personal только поля из белого списка настроек.
    По умолчанию персональные данные не отправляются (SEND_PERSONAL_DATA=False).
    """
    if not personal:
        return None
    if not settings.SEND_PERSONAL_DATA:
        return None
    allowed = [f.strip() for f in settings.ALLOWED_PERSONAL_FIELDS.split(',') if f.strip()]
    if not allowed:
        return None
    return {k: v for k, v in personal.items() if k in allowed}

router = APIRouter(prefix="/query", tags=["Query"])

# ====================== КОНФИГУРАЦИЯ ======================
RAG_BASE_URL = "http://localhost:8001"  # URL RAG сервиса


# ====================== PYDANTIC МОДЕЛИ ======================
class PersonalData(BaseModel):
    """Персональные данные пользователя"""
    full_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[int] = None


class QueryRequest(BaseModel):
    """Запрос к RAG системе"""
    query: str  # вопрос пользователя
    dialog_id: Optional[int] = None  # ID диалога
    personal_data: Optional[PersonalData] = None  # персональные данные пользователя


class QueryResponse(BaseModel):
    """Ответ от RAG системы"""
    response: str  # сгенерированный ответ
    sources: List[dict]  # использованные источники
    dialog_id: int  # ID диалога


# ====================== ENDPOINTS ======================

@router.post("/", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    x_user_id: Optional[str] = Header(None),
    x_role: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Обработка запроса пользователя с контекстом диалога.
    
    Pipeline:
    1. Получить/создать диалог
    2. Получить историю сообщений (контекст)
    3. Отправить в RAG с контекстом
    4. Сохранить оба сообщения (user + bot)
    5. Вернуть ответ
    """
    
    # Проверка аутентификации
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header required")
    
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid User-ID format")
    
    # Получить или создать диалог
    if request.dialog_id:
        dialog = crud_dialog.get_dialog(db, request.dialog_id)
        if not dialog or dialog.user_id != user_id:
            raise HTTPException(status_code=404, detail="Dialog not found")
    else:
        dialog_create = schemas_dialog.DialogCreate(
            user_id=user_id,
            title=f"Диалог от {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        )
        dialog = crud_dialog.create_dialog(db, dialog_create)
    
    # Получить последние 10 сообщений для контекста (возвращаются в обратном порядке)
    context_messages = crud_dialog.get_messages(db, dialog.id, limit=10)
    
    # Подготовить контекст для RAG (в прямом хронологическом порядке для корректной истории диалога)
    context_history = []
    for msg in reversed(context_messages):
        context_history.append({
            "role": "assistant" if msg.sender == "bot" else "user",
            "content": msg.text
        })
    
    # Отправить запрос в RAG
    rag_request = {
        "query": request.query,
        "context": context_history,
        "personal_data": sanitize_personal_data(request.personal_data.dict() if request.personal_data else None)
    }
    
    try:
        rag_response = requests.post(
            f"{RAG_BASE_URL}/rag/answer",
            json=rag_request,
            headers={
                "X-User-ID": str(user_id),
                "X-Role": x_role or "employee"
            },
            timeout=60
        )
        
        if rag_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"RAG error: {rag_response.text}"
            )
        
        rag_data = rag_response.json()
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="RAG timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="RAG unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")
    
    # Сохранить сообщения в диалог
    user_msg = schemas_dialog.MessageCreate(
        sender="user",
        text=request.query,
        sources=None
    )
    crud_dialog.add_message(db, dialog.id, user_msg)
    
    sources_data = rag_data.get("sources", [])
    
    bot_msg = schemas_dialog.MessageCreate(
        sender="bot",
        text=rag_data.get("response", ""),
        sources=sources_data
    )
    crud_dialog.add_message(db, dialog.id, bot_msg)
    
    # Вернуть ответ
    return QueryResponse(
        response=rag_data.get("response", ""),
        sources=sources_data,
        dialog_id=dialog.id
    )


@router.get("/{dialog_id}/context")
async def get_dialog_context(
    dialog_id: int,
    x_user_id: Optional[str] = Header(None),
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Получить контекст диалога (последние N сообщений) для подготовки к RAG запросу.
    Используется для отладки и проверки истории.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header required")
    
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid User-ID format")
    
    dialog = crud_dialog.get_dialog(db, dialog_id)
    if not dialog or dialog.user_id != user_id:
        raise HTTPException(status_code=404, detail="Dialog not found or access denied")
    
    messages = crud_dialog.get_messages(db, dialog_id, limit)
    
    return {
        "dialog_id": dialog_id,
        "messages": messages,
        "message_count": len(messages)
    }

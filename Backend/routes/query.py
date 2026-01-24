from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import crud.dialog as crud_dialog
import schemas.dialog as schemas_dialog
import requests
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from core.config import settings
from core.jwt import decode_token
import json
import asyncio
import time
from models.user import User as UserModel
from dependencies.user import get_current_user, check_resource_ownership

router = APIRouter(prefix="/query", tags=["Query"])


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
    context: Optional[List[dict]] = None  # История диалога (заполняется Backend перед отправкой в RAG)
    enable_thinking: bool = False  # Режим "thinking" для модели (управляется пользователем)

    class Config:
        json_schema_extra = {
            "example": {
                "query": "Какой размер отпуска в компании?",
                "dialog_id": 1,
                "enable_thinking": False
            }
        }


class QueryResponse(BaseModel):
    """Ответ от RAG системы (асинхронный)"""
    request_id: str  # ID запроса для опроса результата
    status: str  # "pending" - добавлен в очередь
    dialog_id: int  # ID диалога


@router.post("/", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Обработка запроса пользователя с контекстом диалога.
    
    Pipeline:
    1. Получить/создать диалог (для текущего пользователя)
    2. Получить историю сообщений (контекст)
    3. Отправить в RAG с контекстом
    4. Сохранить оба сообщения (user + bot)
    5. Вернуть ответ
    """
    # Валидация входных данных
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if len(request.query) > 2000:
        raise HTTPException(status_code=400, detail="Query is too long (max 2000 characters)")
    
    user_id = current_user.id
    
    # Получить или создать диалог
    if request.dialog_id:
        dialog = crud_dialog.get_dialog(db, request.dialog_id)
        if not dialog:
            raise HTTPException(status_code=404, detail="Dialog not found")
        check_resource_ownership(dialog.user_id, current_user)
    else:
        dialog_create = schemas_dialog.DialogCreate(
            user_id=user_id,
            title=f"Диалог от {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        )
        dialog = crud_dialog.create_dialog(db, dialog_create)
    
    # Получить последние 10 сообщений для контекста
    context_messages = crud_dialog.get_messages(db, dialog.id, limit=10)
    context_history = [{"role": m.role, "content": m.content} for m in context_messages]

    # Отправить запрос в RAG с историей диалога
    rag_request = {
        "query": request.query,
        "context": context_history,
        "enable_thinking": request.enable_thinking,  # Передаём выбор пользователя
        "service_token": settings.RAG_SERVICE_TOKEN
    }
    
    try:
        rag_response = requests.post(
            f"{settings.RAG_URL}/rag/answer/queue",
            json=rag_request,
            timeout=120
        )

        if rag_response.status_code != 200:
            detail = rag_response.json().get("detail", rag_response.text) if rag_response.headers.get('content-type') == 'application/json' else rag_response.text
            raise HTTPException(status_code=500, detail=f"RAG error: {detail}")

        rag_data = rag_response.json()
        request_id = rag_data.get("request_id")

        if not request_id:
            raise HTTPException(status_code=500, detail="RAG returned no request_id")
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="RAG service timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="RAG service unavailable")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request processing error: {str(e)}")

    return QueryResponse(
        request_id=request_id,
        status="pending",
        dialog_id=dialog.id
    )


@router.get("/{dialog_id}/context")
async def get_dialog_context(
    dialog_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Получить контекст диалога (последние N сообщений) для подготовки к RAG запросу.
    Используется для отладки и проверки истории.
    """
    
    dialog = crud_dialog.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    check_resource_ownership(dialog.user_id, current_user)
    
    messages = crud_dialog.get_messages(db, dialog_id, limit)
    
    return {
        "dialog_id": dialog_id,
        "messages": messages,
        "message_count": len(messages)
    }


@router.get("/{dialog_id}/result/{request_id}")
async def get_rag_result(
    dialog_id: int,
    request_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить результат обработки от RAG по request_id (асинхронный результат).
    
    Статусы:
    - pending: ждёт обработки
    - processing: сейчас обрабатывается
    - completed: результат готов (содержит response и sources)
    - error: ошибка при обработке
    """
    dialog = crud_dialog.get_dialog(db, dialog_id)
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    check_resource_ownership(dialog.user_id, current_user)
    
    try:
        # Получаем результат от RAG
        rag_response = requests.get(
            f"{settings.RAG_URL}/rag/answer/queue/{request_id}",
            timeout=5
        )
        
        if rag_response.status_code == 404:
            raise HTTPException(status_code=404, detail="Request not found or expired")
        
        if rag_response.status_code != 200:
            raise HTTPException(status_code=500, detail="RAG error")
        
        result = rag_response.json()
        return result
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="RAG service timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="RAG service unavailable")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching result: {str(e)}")

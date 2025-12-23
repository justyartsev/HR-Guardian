from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud.dialog as crud_dialog
import schemas.dialog as schemas_dialog
import requests
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from core.config import settings
from models.user import User as UserModel
from dependencies.user import get_current_user, check_resource_ownership

router = APIRouter(prefix="/query", tags=["Query"])


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
    context: Optional[List[dict]] = None  # История диалога (заполняется Backend перед отправкой в RAG)


class QueryResponse(BaseModel):
    """Ответ от RAG системы (асинхронный)"""
    request_id: str  # ID запроса для опроса результата
    status: str  # "pending" - добавлен в очередь
    dialog_id: int  # ID диалога


# ====================== ENDPOINTS ======================

@router.post("", response_model=QueryResponse)
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
    
    # Получить последние 10 сообщений для контекста (возвращаются в обратном порядке)
    context_messages = crud_dialog.get_messages(db, dialog.id, limit=10)
    
    # Подготовить контекст для RAG (в прямом хронологическом порядке для корректной истории диалога)
    # ⚠️ Ограничиваем размер контекста чтобы не превышать token limit LLM
    context_history = []
    total_chars = 0
    max_context_chars = 2000  # ~500 tokens (примерно)
    
    for msg in reversed(context_messages):
        msg_dict = {
            "role": "assistant" if msg.role == "bot" else "user",
            "content": msg.content
        }
        msg_chars = len(msg.content)
        
        # Если добавление этого сообщения превысит лимит - не добавляем
        if total_chars + msg_chars > max_context_chars:
            break
        
        context_history.append(msg_dict)
        total_chars += msg_chars
    
    # Отправить запрос в RAG с историей диалога
    # ✅ Теперь RAG возвращает request_id вместо полного ответа
    rag_request = {
        "query": request.query,
        "context": context_history,
        "service_token": settings.RAG_SERVICE_TOKEN  # ✅ Токен в JSON
    }
    
    try:
        # RAG добавляет запрос в очередь и возвращает ID
        rag_response = requests.post(
            f"{settings.RAG_URL}/rag/answer",
            json=rag_request,
            timeout=5  # Теперь только надо добавить в очередь (быстро!)
        )
        
        if rag_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"RAG error: {rag_response.text}"
            )
        
        rag_data = rag_response.json()
        request_id = rag_data.get("request_id")
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="RAG timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="RAG unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")
    
    # Сохранить сообщения в диалог (промежуточное состояние)
    user_msg = schemas_dialog.MessageCreate(
        role="user",
        content=request.query,
        sources=None
    )
    crud_dialog.add_message(db, dialog.id, user_msg)
    
    # Bot сообщение со статусом "обработка"
    bot_msg = schemas_dialog.MessageCreate(
        role="bot",
        content=f"⏳ Обрабатываю ваш вопрос (ID: {request_id})...",
        sources=None
    )
    crud_dialog.add_message(db, dialog.id, bot_msg)
    
    # Вернуть ответ с ID запроса
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
            f"{settings.RAG_URL}/rag/result/{request_id}",
            timeout=5
        )
        
        if rag_response.status_code == 404:
            raise HTTPException(status_code=404, detail="Request not found or expired")
        
        if rag_response.status_code != 200:
            raise HTTPException(status_code=500, detail="RAG error")
        
        result = rag_response.json()
        
        # Если результат готов, обновляем сообщение в диалоге
        if result.get("status") == "completed":
            # Обновляем bot сообщение с реальным ответом
            response_text = result.get("response", "")
            sources = result.get("sources", [])
            
            bot_msg = schemas_dialog.MessageCreate(
                sender="bot",
                text=response_text,
                sources=sources
            )
            crud_dialog.add_message(db, dialog_id, bot_msg)
        
        return result
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="RAG timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="RAG unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")

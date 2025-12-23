from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from modules.llm_queue import get_llm_queue, init_llm_queue
import os

# Инициализируем очередь при импорте
init_llm_queue()

router = APIRouter(prefix="/rag", tags=["RAG Query"])


# Схемы данных

class PersonalData(BaseModel):
    """Персональные данные пользователя (full_name, position, department, employee_id)."""
    full_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[int] = None


class ContextMessage(BaseModel):
    """Сообщение из диалога (role, content)."""
    role: str  # "user" или "assistant"
    content: str


class QueryRequest(BaseModel):
    """Запрос к RAG для асинхронной обработки (query, context, personal_data, service_token)."""
    query: str
    context: Optional[List[ContextMessage]] = None
    personal_data: Optional[PersonalData] = None  # Персональные данные пользователя
    service_token: str  # Обязательный токен для Backend service-to-service auth


# Эндпоинты

@router.post("/answer/queue")
async def queue_answer(request: QueryRequest):
    """Добавить запрос в очередь для асинхронной обработки LLM (параметры: request с service_token; возвращает: request_id).
    Pipeline:
    1. Валидация service_token в JSON
    2. Добавление запроса в LLMQueue (maxsize=100) с контекстом и personal_data
    3. Возврат request_id для последующего polling
    
    Эндпоинты очереди:
    - POST /rag/answer/queue: добавить запрос
    - GET /rag/answer/queue/{request_id}: получить результат
    """
    # Валидируем service token - обязательный для всех запросов от Backend
    expected_token = os.getenv("RAG_SERVICE_TOKEN")
    if not expected_token or request.service_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid service token")
    
    try:
        llm_queue = get_llm_queue()
        # Передаём полный контекст: query + context + personal_data
        request_id = await llm_queue.add_request(request.query, context=request.context, personal_data=request.personal_data)
        return {
            "success": True,
            "request_id": request_id,
            "message": "Запрос добавлен в очередь"
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/answer/queue/{request_id}")
async def get_queued_result(request_id: str):
    """Получить результат обработки запроса из очереди (параметры: request_id; возвращает: статус и результат).
    
    Возвращает:
    - 200 с результатом если обработан
    - 202 если в процессе (статус='processing')
    - 404 если истек TTL (30 минут) или не найден
    """
    try:
        llm_queue = get_llm_queue()
        result = await llm_queue.get_result(request_id)
        
        if result is None:
            raise HTTPException(status_code=404, detail=f"Request {request_id} not found or expired")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Проверка доступности RAG сервиса (параметры: нет; возвращает: status и service info)."""
    return {
        "status": "OK",
        "service": "RAG API"
    }

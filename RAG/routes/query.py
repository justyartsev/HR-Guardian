from fastapi import APIRouter, HTTPException, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from modules.db_utility import search
from modules.LLM import answer
from modules.llm_queue import get_llm_queue, init_llm_queue
import json
import os

# Инициализируем очередь при импорте
init_llm_queue()

router = APIRouter(prefix="/rag", tags=["RAG Query"])

# Схемы данных

class SourceReference(BaseModel):
    """Метаданные источника (document_id, version_id, chunk_index, text_snippet)."""
    document_id: Optional[int] = None
    version_id: Optional[int] = None
    chunk_index: Optional[int] = None
    text_snippet: Optional[str] = None


class ContextMessage(BaseModel):
    """Сообщение из диалога (role, content)."""
    role: str  # "user" или "assistant"
    content: str


class QueryRequest(BaseModel):
    """Запрос к RAG (query, context, personal_data, service_token)."""
    query: str
    context: Optional[List[ContextMessage]] = None
    personal_data: Optional[dict] = None
    service_token: Optional[str] = None  # Токен для Backend service-to-service auth


class QueryResponse(BaseModel):
    """Ответ RAG (response, sources, request_id для очереди)."""
    response: str
    sources: List[SourceReference]
    request_id: Optional[str] = None  # ID запроса если обработан очередью


# Эндпоинты

@router.post("/answer", response_model=QueryResponse)
async def generate_answer(
    request: QueryRequest,
    x_user_id: Optional[str] = Header(None),
    x_role: Optional[str] = Header(None),
):
    """Генерирует ответ LLM на вопрос с контекстом диалога (параметры: request, x_user_id, x_role; возвращает: QueryResponse).
    
    Pipeline:
    1. Проверка токена для Backend service-to-service auth
    2. Поиск чанков в Chroma (top_k=3)
    3. Формирование контекста из истории диалога
    4. Запрос к LLM с полным промптом (макс 2000 символов контекста)
    5. Возврат ответа + источники
    """
    
    # Проверяем service token если Backend отправил
    if request.service_token:
        expected_token = os.getenv("RAG_SERVICE_TOKEN")
        if not expected_token or request.service_token != expected_token:
            raise HTTPException(status_code=403, detail="Invalid service token")
    
    try:
        # Поиск релевантных чанков (top_k=3)
        search_results = search(request.query, top_k=3)
        
        # Подготовка чанков и источников
        chunks = []
        sources = []
        
        for result in search_results:
            chunks.append(result["document"])
            
            source = SourceReference(
                document_id=result.get("metadata", {}).get("document_id"),
                version_id=result.get("metadata", {}).get("version_id"),
                chunk_index=result.get("metadata", {}).get("chunk_index"),
                text_snippet=result["document"][:100] + "..."
            )
            sources.append(source)
        
        # Формирование контекста диалога
        dialog_context = ""
        if request.context:
            dialog_context = "История диалога:\n"
            for msg in request.context[-5:]:  # Последние 5 сообщений
                role = "Пользователь" if msg.role == "user" else "Ассистент"
                dialog_context += f"{role}: {msg.content}\n"
        
        # Полный промпт с контекстом и чанками, ограничиваем до 2000 символов
        chunks_text = chr(10).join(chunks) if chunks else "Нет информации"
        chunks_text = chunks_text[:2000]  # Ограничиваем контекст (макс ~500 токенов для Ollama)
        
        full_prompt = f"""{dialog_context}
Новый вопрос: {request.query}

Контекст из документов:
{chunks_text}

Ответь кратко и по делу."""
        
        # Генерация ответа LLM
        try:
            bot_response = answer(full_prompt)
        except Exception as e:
            bot_response = f"Ошибка при обработке: {str(e)}"
        
        # Возврат JSON с явным charset=utf-8
        response_data = QueryResponse(
            response=bot_response,
            sources=sources
        )
        
        return JSONResponse(
            content=json.loads(response_data.model_dump_json(ensure_ascii=False)),
            media_type="application/json; charset=utf-8"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RAG ошибка: {str(e)}"
        )


@router.post("/answer/queue")
async def queue_answer(request: QueryRequest):
    """Добавить запрос в очередь для асинхронной обработки (параметры: request; возвращает: request_id)."""
    try:
        llm_queue = get_llm_queue()
        request_id = await llm_queue.add_request(request.query)
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
    """Получить результат обработки запроса из очереди (параметры: request_id; возвращает: статус и результат)."""
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

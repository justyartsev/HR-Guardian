from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from modules.llm_queue import get_llm_queue, init_llm_queue
from modules.auth import validate_service_token
from config import settings
import json
import asyncio

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
    service_token: Optional[str] = None  # Токен для Backend service-to-service auth (опционально)
    enable_thinking: bool = False  # Режим "thinking" для Qwen3


# Эндпоинты

@router.post("/answer/queue")
async def queue_answer(request: QueryRequest):
    """Добавить запрос в очередь для асинхронной обработки LLM (параметры: request с service_token; возвращает: request_id).
    Pipeline:
    1. Валидация service_token в JSON (если RAG_SERVICE_TOKEN установлен в env)
    2. Добавление запроса в LLMQueue (maxsize=100) с контекстом и personal_data
    3. Возврат request_id для последующего polling
    
    Эндпоинты очереди:
    - POST /rag/answer/queue: добавить запрос
    - GET /rag/answer/queue/{request_id}: получить результат
    """
    # Валидируем service token
    validate_service_token(request.service_token)
    
    try:
        llm_queue = get_llm_queue()
        # Передаём полный контекст: query + context + personal_data + enable_thinking
        request_id = await llm_queue.add_request(
            request.query,
            context=request.context,
            personal_data=request.personal_data,
            enable_thinking=request.enable_thinking
        )
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


@router.post("/answer/stream")
async def sse_answer(request: Request, query_request: QueryRequest):
    """
    SSE (Server-Sent Events) для real-time потокового ответа LLM.
    """
    print(f"[SSE] ===== NEW REQUEST =====", flush=True)
    print(f"[SSE] Query: '{query_request.query[:100]}...' " if len(query_request.query) > 100 else f"[SSE] Query: '{query_request.query}'", flush=True)
    print(f"[SSE] Enable thinking: {query_request.enable_thinking}", flush=True)
    print(f"[SSE] Context messages: {len(query_request.context) if query_request.context else 0}", flush=True)
    
    # Проверяем аутентификацию: либо Authorization header, либо service_token
    auth_header = request.headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        # JWT токен от фронтенда - проверяем формат
        token = auth_header[7:]
        if token.count('.') != 2:
            print(f"[SSE] ERROR: Invalid token format", flush=True)
            raise HTTPException(status_code=401, detail="Invalid token format")
        print(f"[SSE] Auth: Bearer token", flush=True)
    elif query_request.service_token:
        # Service token от backend
        validate_service_token(query_request.service_token)
        print(f"[SSE] Auth: Service token", flush=True)
    else:
        print(f"[SSE] ERROR: No authorization", flush=True)
        raise HTTPException(status_code=401, detail="Authorization required")

    async def event_generator():
        request_id = None
        chunks_sent = 0
        try:
            # Создаём запрос в очереди
            llm_queue = get_llm_queue()
            request_id = await llm_queue.add_request(
                query_request.query,
                context=query_request.context,
                personal_data=query_request.personal_data.dict() if query_request.personal_data else None,
                enable_thinking=query_request.enable_thinking
            )
            print(f"[SSE] Request {request_id} added to queue", flush=True)

            # Получаем объект запроса
            req = llm_queue.cache[request_id]
            
            # Инициализируем очередь чанков (lazy init в правильном event loop)
            chunk_queue = req.chunk_queue

            # Читаем чанки из очереди в реальном времени
            while True:
                # Проверяем, не отключился ли клиент
                if await request.is_disconnected():
                    req.cancel()
                    print(f"[SSE] Client disconnected, cancelling request {request_id}", flush=True)
                    break

                try:
                    # Ждём следующее сообщение из очереди (с таймаутом для проверки disconnect)
                    msg = await asyncio.wait_for(chunk_queue.get(), timeout=0.5)
                    
                    if msg["type"] == "chunk":
                        yield f"event: chunk\ndata: {json.dumps({'text': msg['text'], 'index': msg['index']})}\n\n"
                        chunks_sent += 1
                        if chunks_sent <= 3 or chunks_sent % 50 == 0:
                            print(f"[SSE] Sent chunk {chunks_sent}", flush=True)
                    elif msg["type"] == "done":
                        # Генерация завершена успешно
                        print(f"[SSE] Request {request_id} COMPLETED. Chunks sent: {chunks_sent}", flush=True)
                        yield f"event: complete\ndata: {json.dumps({'response': req.response, 'sources': req.sources or []})}\n\n"
                        break
                    elif msg["type"] == "error":
                        print(f"[SSE] Request {request_id} ERROR: {msg['error']}", flush=True)
                        yield f"event: error\ndata: {json.dumps({'error': msg['error']})}\n\n"
                        break
                        
                except asyncio.TimeoutError:
                    # Таймаут - просто продолжаем (проверим disconnect на следующей итерации)
                    continue

        except Exception as e:
            print(f"[SSE] Request {request_id} EXCEPTION: {e}", flush=True)
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # Cleanup: удаляем завершенный запрос из cache
            if request_id:
                try:
                    llm_queue = get_llm_queue()
                    if request_id in llm_queue.cache:
                        del llm_queue.cache[request_id]
                except:
                    pass
            print(f"[SSE] ===== REQUEST {request_id} FINISHED =====", flush=True)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Для nginx
        }
    )


@router.get("/health")
async def health_check():
    """Проверка доступности RAG сервиса (параметры: нет; возвращает: status и service info)."""
    return {
        "status": "OK",
        "service": "RAG API"
    }

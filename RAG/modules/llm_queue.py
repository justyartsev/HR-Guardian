import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from concurrent.futures import Executor
import logging

logger = logging.getLogger(__name__)


def build_prompt(query: str, context: Optional[list] = None, personal_data: Optional[dict] = None, chunks: Optional[list] = None) -> str:
    """Собирает полный промпт для LLM из всех компонентов
    
    Параметры:
    - query: основной вопрос пользователя
    - context: история диалога (список сообщений с role и content)
    - personal_data: данные пользователя (full_name, position, department, employee_id)
    - chunks: релевантные чанки из документов
    
    Возвращает: полностью сформированный промпт
    """
    parts = []
    
    # 1. История диалога (если есть)
    if context:
        parts.append("История диалога:")
        for msg in context[-5:]:  # Последние 5 сообщений
            role = "Пользователь" if msg.get("role") == "user" else "HR Ассистент"
            content = msg.get("content", "")
            parts.append(f"{role}: {content}")
        parts.append("")
    
    # 2. Персональные данные (если есть)
    if personal_data and any(personal_data.values()):
        parts.append("Информация о пользователе:")
        if personal_data.get("full_name"):
            parts.append(f"ФИ: {personal_data.get('full_name')}")
        if personal_data.get("position"):
            parts.append(f"Должность: {personal_data.get('position')}")
        if personal_data.get("department"):
            parts.append(f"Отдел: {personal_data.get('department')}")
        parts.append("")
    
    # 3. Релевантные чанки из документов
    if chunks:
        parts.append("Информация из документов:")
        for i, chunk in enumerate(chunks[:3]):  # Максимум 3 чанка
            parts.append(f"Документ {i+1}: {chunk[:300]}...")  # Первые 300 символов
        parts.append("")
    else:
        parts.append("(Документы не найдены)")
        parts.append("")
    
    # 4. Основной вопрос
    parts.append(f"Вопрос: {query}")
    parts.append("\nОтвет:")
    
    return "\n".join(parts)


class LLMRequest:
    """Объект запроса к LLM с трекингом статуса"""
    
    def __init__(self, prompt: str, context: Optional[list] = None, personal_data: Optional[dict] = None, request_id: Optional[str] = None):
        self.id = request_id or str(uuid.uuid4())
        self.prompt = prompt
        self.context = context or [] 
        self.personal_data = personal_data or {} 
        self.status = "pending"  # pending, processing, completed, error
        self.response = None
        self.error = None
        self.created_at = datetime.utcnow()
        self.completed_at = None
        # Metadata для возврата вместе с результатом
        self.sources = []
        self.document_id = None
    
    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "response": self.response,
            "error": self.error,
            "sources": self.sources,
            "document_id": self.document_id,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "processing_time": (self.completed_at - self.created_at).total_seconds() if self.completed_at else None
        }


class LLMQueue:
    """Очередь для обработки LLM запросов с гарантией обработки"""
    
    def __init__(self, max_queue_size: int = 100, cache_ttl_minutes: int = 30):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.cache: Dict[str, LLMRequest] = {}  # Хранилище обработанных результатов
        self.cache_ttl = timedelta(minutes=cache_ttl_minutes)
        self.processing = False
        self.executor: Optional[Executor] = None  # Executor для ограничения параллелизма ollama
    
    async def add_request(self, prompt: str, context: Optional[list] = None, personal_data: Optional[dict] = None) -> str:
        """Добавить запрос в очередь с контекстом и personal_data. Возвращает ID запроса"""
        request = LLMRequest(prompt, context=context, personal_data=personal_data)
        
        try:
            # Пытаемся добавить в очередь с timeout (чтобы не зависнуть)
            await asyncio.wait_for(self.queue.put(request), timeout=1.0)
            self.cache[request.id] = request
            logger.info(f"Request {request.id} added to queue. Queue size: {self.queue.qsize()}")
            return request.id
        except asyncio.TimeoutError:
            logger.error(f"Queue is full, cannot add request {request.id}")
            raise RuntimeError("LLM queue is full, try again later")
    
    async def get_result(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Получить результат обработки по ID запроса"""
        if request_id not in self.cache:
            return None
        
        request = self.cache[request_id]
        
        # Очищаем старые кэшированные результаты
        if request.completed_at and datetime.utcnow() - request.completed_at > self.cache_ttl:
            del self.cache[request_id]
            return None
        
        return request.to_dict()
    
    async def process_queue(self, llm_answer_func):
        """
        Background worker - обрабатывает запросы из очереди по одному.
        llm_answer_func должна быть функция async def answer(prompt: str) -> str
        """
        self.processing = True
        logger.info("LLM Queue worker started")
        
        while self.processing:
            try:
                # Получаем запрос из очереди с timeout (чтобы можно было остановить воркер)
                request = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                
                request.status = "processing"
                logger.info(f"Processing request {request.id}")
                
                try:
                    # ✅ Собираем полный промпт с контекстом и personal_data перед отправкой в LLM
                    # (поиск чанков происходит в query.py если нужно)
                    full_prompt = build_prompt(
                        query=request.prompt,
                        context=request.context,
                        personal_data=request.personal_data
                    )
                    
                    # Обрабатываем LLM запрос с использованием dedicated executor (1 поток)
                    loop = asyncio.get_event_loop()
                    executor = self.executor or None  # Используем наш executor если он установлен
                    response = await loop.run_in_executor(executor, llm_answer_func, full_prompt)
                    request.response = response
                    request.status = "completed"
                    logger.info(f"Request {request.id} completed successfully")
                except Exception as e:
                    request.error = str(e)
                    request.status = "error"
                    logger.error(f"Request {request.id} failed: {e}")
                
                request.completed_at = datetime.utcnow()
                self.queue.task_done()
                
            except asyncio.TimeoutError:
                # Нормально - просто нет запросов в очереди
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Unexpected error in queue worker: {e}")
                await asyncio.sleep(0.5)
    
    def stop(self):
        """Остановить воркер"""
        self.processing = False
        logger.info("LLM Queue worker stopping")


# Глобальный экземпляр очереди
llm_queue: Optional[LLMQueue] = None


def init_llm_queue() -> LLMQueue:
    """Инициализировать глобальную очередь"""
    global llm_queue
    if llm_queue is None:
        llm_queue = LLMQueue(max_queue_size=100, cache_ttl_minutes=30)
    return llm_queue


def set_executor(executor: Executor) -> None:
    """Установить executor для ограничения параллелизма при вызове ollama"""
    global llm_queue
    if llm_queue is None:
        llm_queue = init_llm_queue()
    llm_queue.executor = executor
    logger.info(f"LLM Queue executor set to {executor}")


def get_llm_queue() -> LLMQueue:
    """Получить глобальную очередь"""
    global llm_queue
    if llm_queue is None:
        llm_queue = init_llm_queue()
    return llm_queue

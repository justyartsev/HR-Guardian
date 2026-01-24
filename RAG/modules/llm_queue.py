"""
Очередь обработки запросов к LLM
Управляет запросами, кэширует результаты и обрабатывает их в фоновых потоках
"""
import asyncio
import uuid
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Set
from concurrent.futures import Executor
from fastapi import WebSocket
from modules.db_utility import search, get_available_documents
from modules.LLM import answer_streaming

# ═════════════════════════════════════════════════════════════════════════
# ПАТТЕРНЫ ДЛЯ ОПРЕДЕЛЕНИЯ ТИПА ЗАПРОСА
# ═════════════════════════════════════════════════════════════════════════

# Простые приветствия - не требуют поиска в базе знаний
SIMPLE_GREETINGS = {
    'привет', 'здравствуйте', 'здравствуй', 'добрый день', 'доброе утро',
    'добрый вечер', 'хай', 'hello', 'hi', 'hey', 'приветик', 'салют',
    'хелло', 'здаров', 'здарова', 'ку', 'йо', 'доброго времени суток',
    'пока', 'до свидания', 'спасибо', 'благодарю', 'ок', 'окей', 'да', 'нет',
    'хорошо', 'понятно', 'ясно', 'угу', 'ага', 'ладно'
}

# Вопросы о работе ассистента - не требуют поиска
CONVERSATIONAL_PATTERNS = [
    'как твое', 'как твоё', 'как твои', 'как дела', 'как настроение', 'что делаешь',
    'чем занимаешься', 'кто ты', 'что ты', 'расскажи о себе',
    'можешь ли ты', 'умеешь ли ты', 'как ты работаешь',
    'что ты умеешь', 'какие у тебя', 'ты можешь', 'ты умеешь',
    'что нового', 'что новенького', 'как жизнь', 'как оно',
    'как ты себя', 'как себя', 'чувствуешь', 'что у тебя', 'у тебя дела',
    'дела у тебя', 'твои дела'
]

# Вопросы сотрудника о своих данных - используют personal_data
PERSONAL_INFO_PATTERNS = [
    'про меня', 'обо мне', 'расскажи про меня', 'расскажи обо мне',
    'кто я', 'моя должность', 'мой отдел', 'где я работаю',
    'информация обо мне', 'мои данные', 'что ты знаешь обо мне'
]

# Запрос списка доступных документов - используют get_available_documents()
DOCUMENT_LIST_PATTERNS = [
    'какие документы', 'список документов', 'покажи документы',
    'доступные документы', 'что есть в базе', 'какие файлы',
    'перечисли документы', 'что доступно', 'какая информация',
    'какие материалы', 'что могу прочитать', 'что могу узнать',
    'что у вас есть', 'с чем можешь помочь', 'что знаешь',
    'какие темы', 'о чем можешь рассказать', 'твои возможности'
]

# Ключевые слова требующие поиска в базе - конкретные запросы о политике компании
KNOWLEDGE_BASE_KEYWORDS = {
    # Конкретные запросы о цифрах и сроках
    'сколько дней', 'сколько положено', 'размер', 'срок', 'дата',
    'когда можно', 'с какого', 'до какого', 'через сколько',

    # Запросы о документах и процедурах компании
    'в каком документе', 'где написано', 'согласно', 'по регламенту',
    'порядок', 'процедура', 'как получить', 'как оформить',
    'нужно ли', 'положено ли', 'имею ли право',

    # Конкретные HR-термины компании
    'в нашей компании', 'в компании', 'у нас', 'по политике',
    'внутренний', 'корпоративный'
}

# Паттерны абстрактных вопросов - НЕ требуют поиска (модель знает ответ)
ABSTRACT_QUESTION_PATTERNS = [
    # Определения и объяснения
    'что такое', 'что значит', 'что означает', 'это значит',
    'определение', 'объясни', 'расскажи что',

    # Причины и цели (общие, не про конкретную политику)
    'зачем нужен', 'зачем нужна', 'зачем нужно', 'для чего',
    'почему существует', 'почему важно',

    # Общие советы и рекомендации
    'посоветуй', 'как лучше', 'стоит ли', 'лучше ли',
    'что лучше', 'как правильно',

    # Сравнения и различия
    'в чем разница', 'чем отличается', 'что общего'
]


def is_simple_query(query: str) -> bool:
    """Проверяет, является ли запрос простым приветствием БЕЗ контекста"""
    normalized = query.lower().strip()
    # Убираем пунктуацию в конце
    normalized = re.sub(r'[!?.,;:]+$', '', normalized)

    # Убираем ласковые обращения для анализа (они не меняют смысл приветствия)
    cleaned = re.sub(r'\b(пупс|пупсик|детка|солнышко|дорогой|дорогая|милый|милая|котик|зайка|зай)\b', '', normalized).strip()

    # Контекстные слова - если есть хотя бы одно, то НЕ приветствие
    # ВАЖНО: "дела" убрано из контекстных слов т.к. это часть приветствий "как дела"
    context_keywords = {
        # Вопросительные слова
        'что', 'где', 'когда', 'сколько', 'какой', 'какая', 'какие', 'почему', 'зачем', 'откуда', 'куда',
        # Предлоги и союзы (убрали односимвольные предлоги чтобы избежать ложных срабатываний)
        'про', 'об', 'для', 'из',
        # HR-термины
        'отпуск', 'документ', 'зарплата', 'сотрудник', 'работа', 'должность', 'отдел', 'компания',
        'справка', 'больничный', 'премия', 'договор', 'оклад', 'выплата', 'график', 'увольнение'
    }

    words = cleaned.split()

    # Если есть контекстные слова - это НЕ приветствие
    for word in words:
        if word in context_keywords:
            print(f"[DEBUG] Query '{query[:50]}...' rejected: context keyword '{word}' found", flush=True)
            return False

    # Точное совпадение с простыми приветствиями
    if cleaned in SIMPLE_GREETINGS:
        print(f"[DEBUG] Query '{query[:50]}...' matched SIMPLE_GREETINGS", flush=True)
        return True

    # Conversational patterns (только если нет контекстных слов)
    for pattern in CONVERSATIONAL_PATTERNS:
        if pattern in cleaned:
            print(f"[DEBUG] Query '{query[:50]}...' matched pattern '{pattern}'", flush=True)
            return True

    # Короткие фразы с приветствиями (только если нет контекстных слов)
    if len(words) <= 3 and len(cleaned) < 20:
        for word in words:
            if word in SIMPLE_GREETINGS:
                print(f"[DEBUG] Query '{query[:50]}...' matched short greeting", flush=True)
                return True

    return False


def is_document_list_query(query: str) -> bool:
    """Проверяет, спрашивает ли пользователь о списке доступных документов"""
    normalized = query.lower().strip()

    for pattern in DOCUMENT_LIST_PATTERNS:
        if pattern in normalized:
            return True

    return False


def is_personal_info_query(query: str) -> bool:
    """Проверяет, спрашивает ли сотрудник о своих собственных данных"""
    normalized = query.lower().strip()

    for pattern in PERSONAL_INFO_PATTERNS:
        if pattern in normalized:
            return True

    return False


def is_document_overview_query(query: str) -> bool:
    """Проверяет, хочет ли пользователь общее описание документа"""
    normalized = query.lower().strip()

    overview_patterns = [
        'расскажи про', 'расскажи о', 'что такое',
        'что в документе', 'содержание документа', 'опиши документ',
        'содержание', 'опиши', 'что написано',
        'о чем документ', 'про что документ', 'суть документа',
        'кратко о', 'в общих чертах'
    ]

    for pattern in overview_patterns:
        if pattern in normalized:
            return True

    return False


def requires_knowledge_base(query: str) -> bool:
    """Определяет требуется ли поиск в базе знаний

    Возвращает True если есть конкретные вопросы о политике компании.
    Возвращает False для абстрактных вопросов (что такое, зачем, советы).
    """
    normalized = query.lower().strip()

    # Если есть ключевые слова требующие поиска - ищем в базе
    for keyword in KNOWLEDGE_BASE_KEYWORDS:
        if keyword in normalized:
            return True

    # Если это абстрактный вопрос - НЕ ищем в базе
    for pattern in ABSTRACT_QUESTION_PATTERNS:
        if pattern in normalized:
            return False

    # По умолчанию - ищем в базе (безопаснее)
    return True


def build_prompt(query: str, personal_data: Optional[dict] = None, chunks: Optional[list] = None, available_documents: Optional[list] = None, context: Optional[list] = None, is_greeting: bool = False, is_personal_question: bool = False) -> str:
    """Собирает промпт для LLM с защитой от раскрытия данных других людей
    
    Args:
        query: вопрос пользователя
        personal_data: данные ТЕКУЩЕГО сотрудника (full_name, position, department)
        chunks: найденные фрагменты из документов
        available_documents: список доступных документов
        context: история диалога
        is_greeting: это приветствие?
        is_personal_question: сотрудник спрашивает О СЕБЕ?
    """
    parts = []

    # Для приветствий НЕ добавляем документы/персональные данные, но СОХРАНЯЕМ контекст диалога
    # (контекст добавится ниже в блоке "История диалога")

    # 1. Данные о текущем пользователе (ТОЛЬКО если явно спрашивается о себе)
    if personal_data and not is_greeting and is_personal_question:
        full_name = personal_data.get("full_name", "")
        position = personal_data.get("position", "")
        department = personal_data.get("department", "")

        if full_name or position or department:
            parts.append("=== ДАННЫЕ ТЕКУЩЕГО СОТРУДНИКА ===")
            if full_name:
                parts.append(f"Имя сотрудника: {full_name}")
            if position:
                parts.append(f"Должность: {position}")
            if department:
                parts.append(f"Отдел: {department}")
            parts.append("=== ТОЛЬКО ДЛЯ ОТВЕТА О СЕБЕ ===")
            parts.append("ВАЖНО: Используй эти данные ТОЛЬКО для ответа о текущем сотруднике!")
            parts.append("НЕ раскрывай информацию о других людях из документов!")
            parts.append("=================================")
            parts.append("")

    # 2. Список всех доступных документов (пропускаем для приветствий)
    if available_documents and not is_greeting:
        parts.append("Список документов, доступных сотруднику:")
        for doc in available_documents:
            parts.append(f"- {doc.get('title', 'Без названия')}")
        parts.append("")

    # 3. Документы из базы знаний (пропускаем для приветствий)
    if chunks and not is_greeting:
        parts.append("Информация из документов компании:")
        parts.append("⚠️ ЗАЩИТА КОНФИДЕНЦИАЛЬНОСТИ: Информация о других людях НЕ должна раскрываться!")
        seen_docs = set()
        # Используем все чанки для полного ответа (обычно 5-10 чанков)
        for chunk in chunks:
            if isinstance(chunk, dict):
                text = chunk.get('document', '')
                metadata = chunk.get('metadata', {})
                title = metadata.get('title', 'Документ')
            else:
                text = chunk
                title = 'Документ'

            if title not in seen_docs:
                seen_docs.add(title)
            # Увеличиваем размер чанка для лучшего контекста
            text = text[:1200] if len(text) > 1200 else text
            parts.append(f"[{title}]: {text.strip()}")
            parts.append("")

    # 4. История диалога (если есть)
    if context and len(context) > 0:
        recent_context = context[-10:] if len(context) > 10 else context
        for msg in recent_context:
            if isinstance(msg, dict):
                role = msg.get("role", "")
                content = msg.get("content", "")
            else:
                role = getattr(msg, "role", "")
                content = getattr(msg, "content", "")
            content = content[:300] + "..." if len(content) > 300 else content
            prefix = "Сотрудник" if role == "user" else "Ты"
            parts.append(f"{prefix}: {content}")
        parts.append("")

    # 5. Текущий вопрос (просто как продолжение диалога)
    parts.append(f"Сотрудник: {query}")

    return "\n".join(parts)


class LLMRequest:
    """Объект запроса к LLM с трекингом статуса"""

    def __init__(self, prompt: str, context: Optional[list] = None, personal_data: Optional[dict] = None, request_id: Optional[str] = None, enable_thinking: bool = False):
        self.id = request_id or str(uuid.uuid4())
        self.prompt = prompt
        self.context = context or []
        self.personal_data = personal_data or {}
        self.enable_thinking = enable_thinking  # Режим thinking для Qwen3
        self.status = "pending"
        self.cancelled = False  # Флаг отмены запроса
        self.response = None
        self.chunks = []
        self.chunk_index = 0
        self.error = None
        self.created_at = datetime.utcnow()
        self.completed_at = None
        self.sources = []
        self.document_id = None
        self.ws_clients: Set[WebSocket] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._chunk_queue: Optional[asyncio.Queue] = None  # Queue для real-time стриминга

    @property
    def chunk_queue(self) -> asyncio.Queue:
        """Lazy initialization of Queue в правильном event loop"""
        if self._chunk_queue is None:
            self._chunk_queue = asyncio.Queue()
        return self._chunk_queue

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def register_ws(self, ws: WebSocket):
        self.ws_clients.add(ws)
        asyncio.create_task(ws.send_json({
            "type": "start",
            "request_id": self.id,
            "status": self.status
        }))

    def unregister_ws(self, ws: WebSocket):
        self.ws_clients.discard(ws)

    def cancel(self):
        """Отменяет запрос (клиент отключился)"""
        self.cancelled = True
        self.status = "cancelled"

    async def broadcast(self, message: dict):
        if not self.ws_clients:
            return

        disconnected = set()
        for ws in self.ws_clients:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.add(ws)

        self.ws_clients -= disconnected

    def add_chunk(self, text: str):
        """Добавляет чанк и уведомляет SSE через thread-safe Queue"""
        if not text:
            return

        chunk_index = len(self.chunks)
        self.chunks.append(text)
        if self.response is None:
            self.response = ""
        self.response += text

        # Thread-safe: кладём чанк в очередь для SSE
        if self._loop and self._chunk_queue is not None:
            self._loop.call_soon_threadsafe(
                self._chunk_queue.put_nowait,
                {"type": "chunk", "text": text, "index": chunk_index}
            )

        # WebSocket broadcast (если есть)
        if self.ws_clients and self._loop:
            asyncio.run_coroutine_threadsafe(
                self.broadcast({
                    "type": "chunk",
                    "text": text,
                    "index": chunk_index
                }),
                self._loop
            )

    def finish(self, error: str = None):
        """Отправляет финальное сообщение в очередь"""
        if self._loop and self._chunk_queue is not None:
            if error:
                self._loop.call_soon_threadsafe(
                    self._chunk_queue.put_nowait,
                    {"type": "error", "error": error}
                )
            else:
                self._loop.call_soon_threadsafe(
                    self._chunk_queue.put_nowait,
                    {"type": "done"}
                )

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "response": self.response,
            "chunks": self.chunks,
            "chunk_index": self.chunk_index,
            "error": self.error,
            "sources": self.sources,
            "document_id": self.document_id,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "processing_time": (self.completed_at - self.created_at).total_seconds() if self.completed_at else None
        }


class LLMQueue:
    """Очередь для обработки LLM запросов"""

    def __init__(self, max_queue_size: int = 100, cache_ttl_minutes: int = 30):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.cache: Dict[str, LLMRequest] = {}
        self.cache_ttl = timedelta(minutes=cache_ttl_minutes)
        self.processing = False
        self.executor: Optional[Executor] = None

    async def add_request(self, prompt: str, context: Optional[list] = None, personal_data: Optional[dict] = None, enable_thinking: bool = False) -> str:
        request = LLMRequest(prompt, context=context, personal_data=personal_data, enable_thinking=enable_thinking)
        print(f"[LLM_QUEUE] add_request called: ID={request.id}, prompt='{prompt[:50]}...', context={len(context or [])}, thinking={enable_thinking}", flush=True)

        try:
            await asyncio.wait_for(self.queue.put(request), timeout=1.0)
            self.cache[request.id] = request
            print(f"[LLM_QUEUE] Request {request.id} added to queue successfully. Cache size: {len(self.cache)}", flush=True)
            return request.id
        except asyncio.TimeoutError:
            print(f"[LLM_QUEUE] TIMEOUT: Queue is full!", flush=True)
            raise RuntimeError("LLM queue is full, try again later")

    async def get_result(self, request_id: str) -> Optional[Dict[str, Any]]:
        if request_id not in self.cache:
            return None

        request = self.cache[request_id]

        if request.completed_at and datetime.utcnow() - request.completed_at > self.cache_ttl:
            del self.cache[request_id]
            return None

        return request.to_dict()

    def cleanup_expired_cache(self):
        """Удаляет устаревшие записи из кэша. Вызывать периодически."""
        now = datetime.utcnow()
        expired_ids = [
            req_id for req_id, request in self.cache.items()
            if request.completed_at and now - request.completed_at > self.cache_ttl
        ]
        for req_id in expired_ids:
            del self.cache[req_id]
        return len(expired_ids)

    async def process_queue(self, llm_answer_func):
        """Background worker - обрабатывает запросы из очереди по одному"""
        self.processing = True

        while self.processing:
            try:
                try:
                    request = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue

                print(f"[WORKER] Got request {request.id}: '{request.prompt[:50]}...'", flush=True)

                if request.cancelled:
                    print(f"[WORKER] Request already cancelled", flush=True)
                    self.queue.task_done()
                    continue

                request.status = "processing"
                request.set_loop(asyncio.get_running_loop())

                try:
                    user_role = request.personal_data.get("role", "employee") if request.personal_data else "employee"
                    chunks = []
                    available_documents = None
                    is_greeting = False
                    is_personal_question = is_personal_info_query(request.prompt)

                    # Определяем тип запроса
                    if is_personal_question:
                        print(f"[WORKER] Personal info query", flush=True)
                    elif is_simple_query(request.prompt):
                        print(f"[WORKER] Simple/conversational query", flush=True)
                        is_greeting = True
                    elif is_document_list_query(request.prompt):
                        print(f"[WORKER] Document list query", flush=True)
                        available_documents = get_available_documents(user_role=user_role)
                    elif is_document_overview_query(request.prompt):
                        print(f"[WORKER] Document overview query - requesting more chunks", flush=True)
                        chunks = search(request.prompt, top_k=10, user_role=user_role)
                        print(f"[WORKER] Found {len(chunks)} chunks for overview", flush=True)
                        if chunks:
                            for i, chunk in enumerate(chunks[:3]):
                                meta = chunk.get('metadata', {})
                                text_preview = chunk.get('document', '')[:100]
                                print(f"[WORKER]   Chunk {i+1}: doc_id={meta.get('document_id')}, title='{meta.get('title', '')}', text='{text_preview}...'", flush=True)
                    elif requires_knowledge_base(request.prompt):
                        print(f"[WORKER] Knowledge base search required", flush=True)
                        chunks = search(request.prompt, top_k=5, user_role=user_role)
                        print(f"[WORKER] Found {len(chunks)} chunks", flush=True)
                        if chunks:
                            for i, chunk in enumerate(chunks[:3]):
                                meta = chunk.get('metadata', {})
                                text_preview = chunk.get('document', '')[:100]
                                print(f"[WORKER]   Chunk {i+1}: doc_id={meta.get('document_id')}, title='{meta.get('title', '')}', text='{text_preview}...'", flush=True)
                    else:
                        print(f"[WORKER] Abstract/general question - no search needed", flush=True)
                        is_greeting = True  # Используем тот же режим (без документов)

                    # Собираем промпт
                    full_prompt = build_prompt(
                        query=request.prompt,
                        personal_data=request.personal_data,
                        chunks=chunks,
                        available_documents=available_documents,
                        context=request.context,
                        is_greeting=is_greeting,
                        is_personal_question=is_personal_question
                    )

                    print(f"[WORKER] Prompt length: {len(full_prompt)} chars", flush=True)
                    # Выводим промпт для отладки (первые 1500 символов)
                    if chunks:
                        print(f"[WORKER] === PROMPT PREVIEW (first 1500 chars) ===", flush=True)
                        print(f"{full_prompt[:1500]}", flush=True)
                        print(f"[WORKER] === END PROMPT PREVIEW ===\n", flush=True)

                    if chunks:
                        # Группируем чанки по document_id чтобы избежать дублирования источников
                        unique_docs = {}
                        for chunk in chunks:
                            meta = chunk['metadata']
                            doc_id = meta.get('document_id')
                            if doc_id not in unique_docs:
                                unique_docs[doc_id] = meta
                        
                        # Сохраняем уникальные источники в порядке появления
                        request.sources = list(unique_docs.values())
                        request.document_id = chunks[0]['metadata'].get('document_id')
                        
                        print(f"[WORKER] Found {len(chunks)} chunks from {len(request.sources)} unique documents", flush=True)
                        for doc_id, meta in unique_docs.items():
                            print(f"[WORKER]   Document: {meta.get('title')} (id={doc_id})", flush=True)

                    # Генерируем ответ
                    loop = asyncio.get_event_loop()
                    executor = self.executor or None
                    response_text = ""

                    # Используем thinking если включено (не отключаем для приветствий)
                    use_thinking = request.enable_thinking

                    print(f"[LLM_QUEUE] Generating response (thinking={use_thinking}, is_greeting={is_greeting})", flush=True)

                    def stream_and_collect():
                        nonlocal response_text
                        for chunk_text in answer_streaming(full_prompt, enable_thinking=use_thinking):
                            if request.cancelled:
                                print(f"[LLM_QUEUE] Request cancelled", flush=True)
                                break
                            request.add_chunk(chunk_text)
                            response_text += chunk_text
                        return response_text

                    response = await loop.run_in_executor(executor, stream_and_collect)
                    request.response = response

                    # Завершаем
                    if not request.cancelled:
                        request.status = "completed"
                        request.completed_at = datetime.utcnow()
                        # Уведомляем SSE о завершении через Queue
                        request.finish()
                        await request.broadcast({
                            "type": "complete",
                            "response": request.response,
                            "sources": request.sources or [],
                            "document_id": request.document_id
                        })
                    else:
                        request.completed_at = datetime.utcnow()
                        request.finish()
                        print(f"[LLM_QUEUE] Request was cancelled", flush=True)

                except Exception as e:
                    request.error = str(e)
                    request.status = "error"
                    request.completed_at = datetime.utcnow()
                    # Уведомляем SSE об ошибке через Queue
                    request.finish(error=str(e))
                    await request.broadcast({"type": "error", "error": request.error})

                self.queue.task_done()

            except Exception as e:
                await asyncio.sleep(0.5)

    def stop(self):
        self.processing = False


# Глобальный экземпляр очереди
llm_queue: Optional[LLMQueue] = None


def init_llm_queue() -> LLMQueue:
    global llm_queue
    if llm_queue is None:
        llm_queue = LLMQueue(max_queue_size=100, cache_ttl_minutes=30)
    return llm_queue


def set_executor(executor: Executor) -> None:
    global llm_queue
    if llm_queue is None:
        llm_queue = init_llm_queue()
    llm_queue.executor = executor


def get_llm_queue() -> LLMQueue:
    global llm_queue
    if llm_queue is None:
        llm_queue = init_llm_queue()
    return llm_queue

from fastapi import APIRouter, HTTPException, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from modules.db_utility import search
from modules.LLM import answer
import json

router = APIRouter(prefix="/rag", tags=["RAG Query"])

# Схемы данных

class SourceReference(BaseModel):
    """Метаданные источника (документ и чанк)"""
    document_id: Optional[int] = None
    version_id: Optional[int] = None
    chunk_index: Optional[int] = None
    text_snippet: Optional[str] = None


class ContextMessage(BaseModel):
    """Сообщение из истории диалога"""
    role: str  # "user" или "assistant"
    content: str


class QueryRequest(BaseModel):
    """Запрос для генерации ответа"""
    query: str
    context: Optional[List[ContextMessage]] = None
    personal_data: Optional[dict] = None


class QueryResponse(BaseModel):
    """Ответ RAG системы"""
    response: str
    sources: List[SourceReference]


# Эндпоинты

@router.post("/answer", response_model=QueryResponse)
async def generate_answer(
    request: QueryRequest,
    x_user_id: Optional[str] = Header(None),
    x_role: Optional[str] = Header(None),
):
    """
    Генерирует ответ на вопрос пользователя на основе документов.
    
    Pipeline:
    1. Поиск релевантных чанков в Chroma
    2. Формирование контекста из истории диалога + найденные чанки
    3. Запрос к LLM
    4. Возврат ответа + источники
    """
    
    try:
        # Поиск релевантных чанков (top_k=3 для скорости)
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
        
        # Формирование полного промпта
        dialog_context = ""
        if request.context:
            dialog_context = "История диалога:\n"
            for msg in request.context[-5:]:
                role = "Пользователь" if msg.role == "user" else "Ассистент"
                dialog_context += f"{role}: {msg.content}\n"
        
        full_prompt = f"""{dialog_context}
Новый вопрос: {request.query}

Контекст из документов:
{chr(10).join(chunks) if chunks else "Нет информации"}

Ответь кратко и по делу."""
        
        # Генерация ответа
        try:
            bot_response = answer(full_prompt)
        except Exception as e:
            bot_response = f"Ошибка при обработке: {str(e)}"
        
        # Возврат с явным charset=utf-8
        response_data = QueryResponse(
            response=bot_response,
            sources=sources
        )
        
        return JSONResponse(
            content=json.loads(response_data.model_dump_json(ensure_ascii=False)),
            media_type="application/json; charset=utf-8"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RAG ошибка: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Проверка доступности RAG сервиса."""
    return {
        "status": "OK",
        "service": "RAG API"
    }

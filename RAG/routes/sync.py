# Синхронизация документов из Backend в RAG систему
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime
from modules.db_utility import sync_document_version, collection
import requests
from enum import Enum

# Статусы синхронизации (совпадают с Backend)
class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    ARCHIVED = "archived"
    ERROR = "error"

router = APIRouter(prefix="/rag", tags=["RAG Sync"])

# Кэш документов для быстрого доступа (document_id -> file_path и метаданные)
_document_cache = {}


def validate_service_token(service_token: str):
    """Валидирует service_token для Backend service-to-service auth.
    Параметры: service_token; возвращает: None или HTTPException 403."""
    expected_token = os.getenv("RAG_SERVICE_TOKEN")
    if not expected_token or service_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid service token")

# Pydantic модели синхронизации

class SyncDocumentRequest(BaseModel):
    """Запрос на синхронизацию (document_id, version_id, title, content, file_path, service_token)."""
    document_id: int  # ID документа в Backend
    version_id: int  # ID версии документа в Backend
    title: str  # Название документа
    content: Optional[str] = None  # Текстовое содержимое
    file_path: Optional[str] = None  # Путь к файлу
    service_token: str  # Обязательный токен для Backend service-to-service auth (JSON)


class SyncDocumentResponse(BaseModel):
    """Результат синхронизации (success, document_id, version_id, chunks_created, message)."""
    success: bool
    document_id: int
    version_id: int
    chunks_created: int
    message: str


# Эндпоинты синхронизации


@router.post("/sync/document", response_model=SyncDocumentResponse)
async def sync_document(
    request: SyncDocumentRequest
):
    """Синхронизирует документ версию в Chroma (параметры: request с service_token в JSON; возвращает: SyncDocumentResponse).
    
    """
    #  Валидируем service token - обязательный для всех запросов от Backend
    validate_service_token(request.service_token)

    try:
        chunks_created = sync_document_version(
            document_id=request.document_id,
            version_id=request.version_id,
            title=request.title,
            content=request.content,
            file_path=request.file_path
        )
        
        #  Кэшируем file_path и метаданные для доступа через Backend download эндпоинт
        if request.file_path:
            _document_cache[request.document_id] = {
                "title": request.title,
                "file_path": request.file_path,
                "version_id": request.version_id,
                "synced_at": datetime.now().isoformat()
            }
        
        # Отправляем результат обратно в Backend (опционально)
        try:
            backend_url = os.getenv("RAG_BACKEND_URL", "http://localhost:8000").rstrip('/')
            callback_token = os.getenv("RAG_CALLBACK_SECRET")
            cb_url = f"{backend_url}/internal/rag/sync_result"
            resp = requests.post(cb_url, json={
                "document_id": request.document_id,
                "version_id": request.version_id,
                "chunks_created": chunks_created,
                "callback_token": callback_token,
                "sync_status": SyncStatus.SYNCED.value
            }, timeout=10)
            if resp.status_code != 200:
                print(f"[RAG] Warning: backend callback returned {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[RAG] Warning: failed to call backend callback: {e}")
        
        return SyncDocumentResponse(
            document_id=request.document_id,
            version_id=request.version_id,
            chunks_created=chunks_created,
            message="Синхронизировано успешно"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{document_id}")
async def get_document_info(
    document_id: int
):
    """Получить информацию о документе из кэша RAG (параметры: document_id; возвращает: file_path и метаданные).

    """
    if document_id in _document_cache:
        return _document_cache[document_id]
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not in cache. It may not be synced yet."
        )


@router.delete("/sync/document/{document_id}/version/{version_id}")
async def delete_document_version(
    document_id: int,
    version_id: int,
    service_token: str 
):
    """Удаляет версию документа из Chroma (параметры: document_id, version_id; возвращает: результат удаления).

    """
    validate_service_token(service_token)
    
    try:
        # Ищем все чанки этой версии в Chroma
        results = collection.get(
            where={
                "$and": [
                    {"document_id": {"$eq": document_id}},
                    {"version_id": {"$eq": version_id}}
                ]
            }
        )
        
        # Удаляем найденные чанки
        if results["ids"]:
            collection.delete(ids=results["ids"])
            deleted_count = len(results["ids"])
        else:
            deleted_count = 0
        
        # Возвращаем результат
        return {
            "success": True,
            "document_id": document_id,
            "version_id": version_id,
            "chunks_deleted": deleted_count,
            "message": f"Удалено {deleted_count} чанков из БД"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при удалении: {str(e)}"
        )




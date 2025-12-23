# Синхронизация документов из Backend в RAG систему
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import os
from datetime import datetime
from modules.db_utility import sync_document_version, collection
import requests
from modules.reader import DocumentReader
from modules.chunker import semantic_chunking_vectors
from enum import Enum

# Статусы синхронизации (совпадают с Backend)
class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    ARCHIVED = "archived"
    ERROR = "error"

router = APIRouter(prefix="/rag", tags=["RAG Sync"])


def check_role_allowed(x_role: Optional[str]):
    """Проверяет роль (только 'hr' и 'admin'); параметры: x_role; возвращает: None или HTTPException."""
    if not x_role or x_role.lower() not in ("hr", "admin"):
        raise HTTPException(status_code=403, detail="Role not allowed to perform sync")

# Pydantic модели синхронизации

class SyncDocumentRequest(BaseModel):
    """Запрос на синхронизацию (document_id, version_id, title, content, file_path, service_token)."""
    document_id: int  # ID документа в Backend
    version_id: int  # ID версии документа в Backend
    title: str  # Название документа
    content: Optional[str] = None  # Текстовое содержимое
    file_path: Optional[str] = None  # Путь к файлу
    service_token: Optional[str] = None  # Токен для Backend service-to-service auth


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
    request: SyncDocumentRequest,
    x_role: Optional[str] = Header(None)
):
    """Синхронизирует документ версию в Chroma (параметры: request, x_role; возвращает: SyncDocumentResponse)."""
    check_role_allowed(x_role)
    
    # Проверяем service token если Backend отправил
    if request.service_token:
        expected_token = os.getenv("RAG_SERVICE_TOKEN")
        if not expected_token or request.service_token != expected_token:
            raise HTTPException(status_code=403, detail="Invalid service token")

    try:
        chunks_created = sync_document_version(
            document_id=request.document_id,
            version_id=request.version_id,
            title=request.title,
            content=request.content,
            file_path=request.file_path
        )
        # Отправляем результат обратно в Backend (опционально)
        try:
            backend_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip('/')
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
            success=True,
            document_id=request.document_id,
            version_id=request.version_id,
            chunks_created=chunks_created,
            message="Синхронизировано успешно"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sync/document/{document_id}/version/{version_id}")
async def delete_document_version(
    document_id: int,
    version_id: int,
    x_user_id: Optional[str] = Header(None),
    x_role: Optional[str] = Header(None),
):
    """Удаляет версию документа из Chroma (параметры: document_id, version_id, x_role; возвращает: результат удаления)."""
    check_role_allowed(x_role)
    
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


@router.post("/sync/activate/{document_id}")
async def activate_document_version(
    document_id: int,
    version_id: int = 0,
    x_user_id: Optional[str] = Header(None),
    x_role: Optional[str] = Header(None),
):
    """Активирует версию документа, деактивирует остальные (параметры: document_id, version_id, x_role; возвращает: результат активации)."""
    check_role_allowed(x_role)
    
    try:
        # Деактивируем все версии этого документа
        all_versions = collection.get(
            where={"document_id": {"$eq": document_id}}
        )
        
        # Устанавливаем статус "archived" для всех
        if all_versions["ids"]:
            collection.update(
                ids=all_versions["ids"],
                metadatas=[
                    {**metadata, "status": SyncStatus.ARCHIVED.value}
                    for metadata in all_versions["metadatas"]
                ]
            )
        
        # Активируем нужную версию
        target_version = collection.get(
            where={
                "$and": [
                    {"document_id": {"$eq": document_id}},
                    {"version_id": {"$eq": version_id}}
                ]
            }
        )
        
        # Устанавливаем статус "synced"
        if target_version["ids"]:
            collection.update(
                ids=target_version["ids"],
                metadatas=[
                    {**metadata, "status": SyncStatus.SYNCED.value}
                    for metadata in target_version["metadatas"]
                ]
            )
            activated_count = len(target_version["ids"])
        else:
            activated_count = 0
        
        # Возвращаем результат
        return {
            "success": True,
            "document_id": document_id,
            "version_id": version_id,
            "chunks_activated": activated_count,
            "message": f"Активировано {activated_count} чанков версии {version_id}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при активации: {str(e)}"
        )

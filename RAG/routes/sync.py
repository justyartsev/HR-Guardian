# Синхронизация документов из Backend в RAG систему
from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from modules.db_utility import sync_document_version, init_vectordb
from modules.auth import validate_service_token
from config import settings
import requests
from enum import Enum
import io
from pathlib import Path

# Статусы синхронизации
class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    ARCHIVED = "archived"
    ERROR = "error"

router = APIRouter(prefix="/rag", tags=["RAG Sync"])

# Кэш документов для быстрого доступа (document_id -> file_path и метаданные)
_document_cache = {}


class SyncDocumentRequest(BaseModel):
    """Запрос на синхронизацию."""
    document_id: int
    version_id: int
    title: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    service_token: str


class SyncDocumentResponse(BaseModel):
    """Результат синхронизации."""
    success: bool
    document_id: int
    version_id: int
    chunks_created: int
    message: str


@router.post("/sync/document", response_model=SyncDocumentResponse)
async def sync_document(
    document_id: int = Form(...),
    version_id: int = Form(...),
    title: str = Form(...),
    service_token: str = Form(...),
    callback_token: str = Form(...),
    access_level: str = Form("all"),  # Уровень доступа: all, hr_only, admin_only
    file: UploadFile = File(...)
):
    """Синхронизирует документ версию в Chroma"""
    print(f"[RAG_SYNC] Document {document_id}, Version {version_id}, access_level={access_level}, File: {file.filename}")

    try:
        validate_service_token(service_token)

        content = await file.read()

        if not content:
            print(f"[RAG_SYNC] ERROR: File is empty")
            raise ValueError("File is empty")

        # Сохраняем во временный файл
        import tempfile
        temp_dir = tempfile.gettempdir()
        temp_file_path = Path(temp_dir) / f"doc_{document_id}_v{version_id}_{file.filename}"

        with open(temp_file_path, 'wb') as f:
            f.write(content)

        # Синхронизируем документ
        chunks_created = sync_document_version(
            document_id=document_id,
            version_id=version_id,
            title=title,
            content=None,
            file_path=str(temp_file_path),
            access_level=access_level
        )

        print(f"[RAG_SYNC] OK: {chunks_created} chunks created")

        # Удаляем временный файл
        try:
            temp_file_path.unlink()
        except Exception:
            pass

        # Отправляем callback в Backend
        try:
            cb_url = f"{settings.RAG_BACKEND_URL}/internal/rag/sync_result"
            print(f"[RAG_SYNC] Sending callback to: {cb_url}", flush=True)

            callback_payload = {
                "document_id": document_id,
                "version_id": version_id,
                "chunks_created": chunks_created,
                "sync_status": SyncStatus.SYNCED.value,
                "callback_token": callback_token
            }

            resp = requests.post(cb_url, json=callback_payload, timeout=10)
            print(f"[RAG_SYNC] Callback sent: {resp.status_code}", flush=True)
        except Exception as e:
            print(f"[RAG_SYNC] Callback error: {e}")

        return SyncDocumentResponse(
            success=True,
            document_id=document_id,
            version_id=version_id,
            chunks_created=chunks_created,
            message="Document synced successfully"
        )

    except Exception as e:
        print(f"[RAG_SYNC] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{document_id}")
async def get_document_info(document_id: int):
    """Получить информацию о документе из кэша RAG."""
    if document_id in _document_cache:
        return _document_cache[document_id]
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Document {document_id} not in cache. It may not be synced yet."
        )


@router.delete("/sync/document/{document_id}")
async def delete_all_document_versions(
    document_id: int,
    service_token: str = Query(..., description="Service token for authentication")
):
    """Удаляет ВСЕ версии документа из Chroma"""
    print(f"[RAG_DELETE] Document {document_id} (all versions)")

    validate_service_token(service_token)

    try:
        collection = init_vectordb()  # Инициализируем коллекцию
        document_id = int(document_id)

        results = collection.get(
            where={"document_id": {"$eq": document_id}}
        )

        if results["ids"]:
            collection.delete(ids=results["ids"])
            deleted_count = len(results["ids"])
            print(f"[RAG_DELETE] Deleted {deleted_count} chunks")
        else:
            deleted_count = 0
            print(f"[RAG_DELETE] No chunks found for document {document_id}")

        return {
            "success": True,
            "document_id": document_id,
            "chunks_deleted": deleted_count,
            "message": f"Deleted {deleted_count} chunks"
        }

    except Exception as e:
        print(f"[RAG_DELETE] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sync/document/{document_id}/version/{version_id}")
async def delete_document_version(
    document_id: int,
    version_id: int,
    service_token: str = Query(..., description="Service token for authentication")
):
    """Удаляет конкретную версию документа из Chroma"""
    print(f"[RAG_DELETE] Document {document_id}, Version {version_id}")

    validate_service_token(service_token)

    try:
        collection = init_vectordb()  # Инициализируем коллекцию
        document_id = int(document_id)
        version_id = int(version_id)

        results = collection.get(
            where={
                "$and": [
                    {"document_id": {"$eq": document_id}},
                    {"version_id": {"$eq": version_id}}
                ]
            }
        )

        if results["ids"]:
            collection.delete(ids=results["ids"])
            deleted_count = len(results["ids"])
            print(f"[RAG_DELETE] Deleted {deleted_count} chunks")
        else:
            deleted_count = 0
            print(f"[RAG_DELETE] No chunks found to delete")

        return {
            "success": True,
            "document_id": document_id,
            "version_id": version_id,
            "chunks_deleted": deleted_count,
            "message": f"Deleted {deleted_count} chunks"
        }

    except Exception as e:
        print(f"[RAG_DELETE] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/documents")
async def list_indexed_documents(
    service_token: str = Query(..., description="Service token for authentication")
):
    """Получить список всех проиндексированных документов в ChromaDB"""
    validate_service_token(service_token)

    try:
        collection = init_vectordb()  # Инициализируем коллекцию
        all_data = collection.get(include=["metadatas"])

        document_ids = set()
        for meta in all_data.get("metadatas", []):
            if meta and "document_id" in meta:
                document_ids.add(meta["document_id"])

        return {
            "success": True,
            "total_chunks": len(all_data.get("ids", [])),
            "document_ids": sorted(list(document_ids)),
            "count": len(document_ids)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

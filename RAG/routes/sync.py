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

router = APIRouter(prefix="/rag", tags=["RAG Sync"])


def check_role_allowed(x_role: Optional[str]):
    """Простая проверка роли на уровне RAG: разрешены 'hr' и 'admin'"""
    if not x_role or x_role.lower() not in ("hr", "admin"):
        raise HTTPException(status_code=403, detail="Role not allowed to perform sync")

# PYDANTIC МОДЕЛИ 


class SyncDocumentRequest(BaseModel):
    """Запрос на синхронизацию документа с Backend"""
    document_id: int  # ID документа в Backend
    version_id: int  # ID версии документа в Backend
    title: str  # название документа
    content: Optional[str] = None  # текстовое содержимое
    file_path: Optional[str] = None  # путь к файлу


class SyncDocumentResponse(BaseModel):
    """Ответ при синхронизации документа"""
    success: bool
    document_id: int
    version_id: int
    chunks_created: int
    message: str


# ENDPOINTS


@router.post("/sync/document", response_model=SyncDocumentResponse)
async def sync_document(
    request: SyncDocumentRequest,
    x_role: Optional[str] = Header(None)
):
    check_role_allowed(x_role)

    try:
        chunks_created = sync_document_version(
            document_id=request.document_id,
            version_id=request.version_id,
            title=request.title,
            content=request.content,
            file_path=request.file_path
        )
        # Report result back to Backend (optional). Backend must expose internal endpoint.
        try:
            backend_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip('/')
            callback_secret = os.getenv("RAG_CALLBACK_SECRET")
            cb_url = f"{backend_url}/internal/rag/sync_result"
            headers = {}
            if callback_secret:
                headers['X-Internal-Token'] = callback_secret
            resp = requests.post(cb_url, json={
                "document_id": request.document_id,
                "version_id": request.version_id,
                "chunks_created": chunks_created
            }, headers=headers, timeout=10)
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
    check_role_allowed(x_role)
    """
    Удаление версии документа из RAG системы.
    
    Используется когда документ помечается как архивированный в Backend.
    Удаляются все чанки этой версии из ChromaDB.
    
    Args:
        document_id: ID документа в Backend
        version_id: ID версии документа в Backend
    
    Returns:
        Информация об удалении
    """
    
    try:
        # ===== УДАЛЕНИЕ ИЗ CHROMADB =====
        # Ищем все чанки этой версии документа
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
        
        # ===== ВОЗВРАТ РЕЗУЛЬТАТА =====
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
    check_role_allowed(x_role)
    """
    Активация определённой версии документа.
    Деактивирует все остальные версии этого документа.
    
    Используется когда в Backend устанавливается новая активная версия.
    
    Args:
        document_id: ID документа в Backend
        version_id: ID версии для активации (по умолчанию последняя)
    
    Returns:
        Информация об активации
    """
    
    try:
        # ===== ДЕАКТИВАЦИЯ СТАРЫХ ВЕРСИЙ =====
        # Находим все чанки этого документа
        all_versions = collection.get(
            where={"document_id": {"$eq": document_id}}
        )
        
        # Обновляем статус на неактивный для всех
        if all_versions["ids"]:
            collection.update(
                ids=all_versions["ids"],
                metadatas=[
                    {**metadata, "status": "archived"}
                    for metadata in all_versions["metadatas"]
                ]
            )
        
        # ===== АКТИВАЦИЯ НОВОЙ ВЕРСИИ =====
        # Находим чанки нужной версии
        target_version = collection.get(
            where={
                "$and": [
                    {"document_id": {"$eq": document_id}},
                    {"version_id": {"$eq": version_id}}
                ]
            }
        )
        
        # Обновляем статус на активный
        if target_version["ids"]:
            collection.update(
                ids=target_version["ids"],
                metadatas=[
                    {**metadata, "status": "active"}
                    for metadata in target_version["metadatas"]
                ]
            )
            activated_count = len(target_version["ids"])
        else:
            activated_count = 0
        
        # ===== ВОЗВРАТ РЕЗУЛЬТАТА =====
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

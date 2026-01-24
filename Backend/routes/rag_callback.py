import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import crud.document as document_crud
from core.config import settings

router = APIRouter(prefix="/internal", tags=["Internal"])


# Вспомогательные функции

def _validate_callback_token(callback_token: Optional[str]):
    """Валидирует callback_token для RAG callbacks.
    ВНИМАНИЕ: Если RAG_CALLBACK_SECRET не установлен - все callback запросы блокируются."""
    expected_token = settings.RAG_CALLBACK_SECRET
    if not expected_token:
        raise HTTPException(status_code=500, detail="RAG_CALLBACK_SECRET not configured")
    if callback_token != expected_token:
        raise HTTPException(status_code=403, detail="Invalid callback token")


# Pydantic модели

class SyncResult(BaseModel):
    document_id: int
    version_id: int
    chunks_created: int
    callback_token: Optional[str] = None


@router.post("/rag/sync_result")
async def rag_sync_result(
    payload: SyncResult,
    db: Session = Depends(get_db),
):
    """Callback от RAG для уведомления о результате синхронизации документа

    Request JSON:
    {
      "document_id": 1,
      "version_id": 5,
      "chunks_created": 42,
      "callback_token": "super_secret_token"
    }
    """
    print(f"[RAG_CALLBACK] Document {payload.document_id}, Version {payload.version_id}, Chunks: {payload.chunks_created}")

    _validate_callback_token(payload.callback_token)

    # Обновить статус синхронизации версии документа
    try:
        version, old_versions = document_crud.update_version_sync(db, payload.version_id, payload.chunks_created)

        print(f"[RAG_CALLBACK] Updated version {payload.version_id} status to {version.sync_status}")
        if old_versions:
            print(f"[RAG_CALLBACK] Archived {len(old_versions)} old versions")

        # Уведомить HR об активации документа (ТЗ Сценарий 1, п.2)
        if version and version.document:
            from core.notifications import notification_manager
            await notification_manager.notify_document_activated(
                doc_id=payload.document_id,
                doc_title=version.document.title,
                version_id=payload.version_id
            )
            print(f"[RAG_CALLBACK] Sent activation notification for document {payload.document_id}")

        # Удалить чанки старых версий из RAG
        for doc_id, old_version_id in old_versions:
            try:
                requests.delete(
                    f"{settings.RAG_URL}/rag/sync/document/{doc_id}/version/{old_version_id}",
                    params={"service_token": settings.RAG_SERVICE_TOKEN},
                    timeout=30
                )
            except Exception as e:
                # Логируем, но не падаем - удаление из RAG не критично
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to delete old version {old_version_id} from RAG: {e}")
    except Exception as e:
        print(f"[RAG_CALLBACK] ERROR updating version: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True}

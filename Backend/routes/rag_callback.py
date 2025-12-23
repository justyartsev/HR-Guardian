import os
import requests
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import crud.document as document_crud
from core.config import settings

router = APIRouter(prefix="/internal", tags=["Internal"])


class SyncResult(BaseModel):
    document_id: int
    version_id: int
    chunks_created: int


@router.post("/rag/sync_result")
def rag_sync_result(
    payload: SyncResult,
    x_internal_token: str | None = Header(None, convert_underscores=False),
    db: Session = Depends(get_db),
):
    """Callback от RAG для уведомления о результате синхронизации документа"""
    # Проверка токена, если он установлен в конфиге
    if settings.RAG_CALLBACK_SECRET:
        if not x_internal_token or x_internal_token != settings.RAG_CALLBACK_SECRET:
            raise HTTPException(status_code=403, detail="Invalid internal token")

    # Обновить статус синхронизации версии документа
    try:
        version, old_versions = document_crud.update_version_sync(db, payload.version_id, payload.chunks_created)
        
        # Удалить чанки старых версий из RAG
        for doc_id, old_version_id in old_versions:
            try:
                requests.delete(
                    f"{settings.RAG_URL}/rag/sync/document/{doc_id}/version/{old_version_id}",
                    headers={"X-Role": "admin"},
                    timeout=30
                )
            except Exception as e:
                # Логируем, но не падаем - удаление из RAG не критично
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to delete old version {old_version_id} from RAG: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True}

import os
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import crud.document as document_crud

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
    """Internal endpoint called by RAG to report sync result.

    Protect with header `X-Internal-Token` matching env `RAG_CALLBACK_SECRET`.
    """
    secret = os.getenv("RAG_CALLBACK_SECRET")
    if secret:
        if not x_internal_token or x_internal_token != secret:
            raise HTTPException(status_code=403, detail="Invalid internal token")

    # Update DB record for the version
    try:
        document_crud.update_version_sync(db, payload.version_id, payload.chunks_created)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True}

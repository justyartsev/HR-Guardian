from pydantic import BaseModel, computed_field
from datetime import datetime
from typing import Optional, List
from core.enums import DocumentFormat, SyncStatus, AccessLevel


class DocumentVersionBase(BaseModel):
    format: DocumentFormat
    content: Optional[str] = None
    file_path: Optional[str] = None
    change_comment: Optional[str] = None
    effective_from: Optional[datetime] = None


class DocumentVersionCreate(DocumentVersionBase):
    pass


class DocumentVersionResponse(DocumentVersionBase):
    id: int
    sync_status: SyncStatus
    created_at: datetime
    change_comment: Optional[str] = None
    display_status: Optional[str] = None  # Человекочитаемый статус версии

    class Config:
        from_attributes = True
        use_enum_values = True


class DocumentBase(BaseModel):
    title: str
    access_level: AccessLevel = AccessLevel.all


class DocumentCreate(DocumentBase):
    initial_version: Optional[DocumentVersionCreate] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    access_level: Optional[AccessLevel] = None


class DocumentResponse(DocumentBase):
    id: int
    current_version_id: Optional[int]
    versions: List[DocumentVersionResponse]

    class Config:
        from_attributes = True
        use_enum_values = True

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DocumentFormat(str, Enum):
    pdf = "pdf"
    docx = "docx"
    md = "md"
    txt = "txt"
    html = "html"
    wiki = "wiki"
    faq = "faq"


# ---------------------------
# DocumentVersion Schemas
# ---------------------------

class DocumentVersionBase(BaseModel):
    format: DocumentFormat
    content: Optional[str] = None
    file_path: Optional[str] = None


class DocumentVersionCreate(DocumentVersionBase):
    pass


class DocumentVersionResponse(DocumentVersionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


# ---------------------------
# Document Schemas
# ---------------------------

class DocumentBase(BaseModel):
    title: str
    effective_from: Optional[datetime] = None


class DocumentCreate(DocumentBase):
    initial_version: Optional[DocumentVersionCreate] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    effective_from: Optional[datetime] = None


class DocumentResponse(DocumentBase):
    id: int
    current_version_id: Optional[int]
    versions: List[DocumentVersionResponse]

    class Config:
        from_attributes = True
        use_enum_values = True

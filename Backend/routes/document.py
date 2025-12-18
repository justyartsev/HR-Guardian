import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
import crud.document as document_crud
from schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentResponse,
    DocumentFormat
)
from typing import List, Optional

router = APIRouter(prefix="/documents", tags=["Documents"])

FILES_ROOT = "./files/documents"


# --------------------------------------------------
# CREATE DOCUMENT (file or text)
# --------------------------------------------------
@router.post("/", response_model=DocumentResponse)
async def create_document(
    title: str = Form(...),
    effective_from: Optional[str] = Form(None),
    format: DocumentFormat = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Проверка: либо файл, либо текст
    if not content and not file:
        raise HTTPException(400, "Provide either `content` or `file`")

    # Создаём базовый документ
    doc_data = DocumentCreate(
        title=title,
        effective_from=effective_from,
        initial_version=None
    )

    # Создание пустого документа, получим ID
    doc = document_crud.create_empty_document(db, doc_data)

    # Подготовка версии
    version = DocumentVersionCreate(format=format)

    # Если загружен файл — сохраняем
    if file:
        doc_dir = f"{FILES_ROOT}/{doc.id}/1"
        os.makedirs(doc_dir, exist_ok=True)
        file_path = f"{doc_dir}/{file.filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        version.file_path = file_path

    # Если текст
    if content:
        version.content = content

    # Создаём первую версию
    doc = document_crud.add_document_version(db, doc.id, version)

    return doc


# --------------------------------------------------
# GET ALL DOCUMENTS
# --------------------------------------------------
@router.get("/", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return document_crud.list_documents(db)


# --------------------------------------------------
# GET DOCUMENT BY ID
# --------------------------------------------------
@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


# --------------------------------------------------
# UPDATE DOCUMENT META (title, effective_from)
# --------------------------------------------------
@router.put("/{doc_id}", response_model=DocumentResponse)
def update_document(doc_id: int, data: DocumentUpdate, db: Session = Depends(get_db)):
    doc = document_crud.update_document(db, doc_id, data)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


# --------------------------------------------------
# DELETE DOCUMENT
# --------------------------------------------------
@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    ok = document_crud.delete_document(db, doc_id)
    if not ok:
        raise HTTPException(404, "Document not found")
    return {"status": "deleted"}


# --------------------------------------------------
# ADD NEW VERSION (file or text)
# --------------------------------------------------
@router.post("/{doc_id}/versions", response_model=DocumentResponse)
async def add_version(
    doc_id: int,
    format: DocumentFormat = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    version = DocumentVersionCreate(format=format)

    # Проверка: либо файл, либо текст
    if not content and not file:
        raise HTTPException(400, "Provide either `content` or `file`")

    # Номер версии = len(versions)+1
    version_number = len(doc.versions) + 1

    if file:
        doc_dir = f"{FILES_ROOT}/{doc.id}/{version_number}"
        os.makedirs(doc_dir, exist_ok=True)
        file_path = f"{doc_dir}/{file.filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        version.file_path = file_path

    if content:
        version.content = content

    doc = document_crud.add_document_version(db, doc_id, version)
    return doc

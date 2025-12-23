import os
import requests
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from starlette.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import crud.document as document_crud
from dependencies.user import get_current_user, require_role
from models.user import User as UserModel
from schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentResponse,
    DocumentFormat
)
from typing import List, Optional
from core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

# Допустимые форматы файлов (обработка в RAG: txt, docx с таблицами, md, pdf с OCR)
ALLOWED_FORMATS = {'.txt', '.pdf', '.docx', '.md', '.wiki', '.faq'}
FILES_ROOT = "./files/documents"

# --------------------------------------------------
# CREATE DOCUMENT
# --------------------------------------------------
@router.post("/", response_model=DocumentResponse)
async def create_document(
    title: str = Form(...),
    effective_from: Optional[str] = Form(None),
    format: DocumentFormat = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Создать новый документ или добавить версию к существующему"""
    
    # Проверка расширения файла
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_FORMATS:
        raise HTTPException(
            400,
            f"Unsupported file format. Allowed: {', '.join(ALLOWED_FORMATS)}"
        )

    # Проверяем, есть ли уже документ с таким названием и форматом
    existing_doc = document_crud.find_document_by_title_and_format(db, title, format)
    
    if existing_doc:
        # Добавляем новую версию к существующему документу
        doc = existing_doc
        version_number = len(doc.versions) + 1
        doc_dir = f"{FILES_ROOT}/{doc.id}/{version_number}"
        os.makedirs(doc_dir, exist_ok=True)
        file_path = f"{doc_dir}/{file.filename}"
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        version = DocumentVersionCreate(format=format, file_path=file_path)
        doc = document_crud.add_document_version(db, doc.id, version)
    else:
        # Создаём новый документ с первой версией
        doc_data = DocumentCreate(
            title=title,
            effective_from=effective_from,
            initial_version=None
        )
        doc = document_crud.create_empty_document(db, doc_data)
        
        # Сохраняем первую версию
        doc_dir = f"{FILES_ROOT}/{doc.id}/1"
        os.makedirs(doc_dir, exist_ok=True)
        file_path = f"{doc_dir}/{file.filename}"
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        version = DocumentVersionCreate(format=format, file_path=file_path)
        doc = document_crud.add_document_version(db, doc.id, version)

    # Отправляем в RAG для обработки
    try:
        requests.post(
            f"{settings.RAG_URL}/rag/sync/document",
            json={
                "document_id": doc.id,
                "version_id": doc.current_version_id,
                "title": doc.title,
                "file_path": file_path
            },
            headers={"X-Role": "admin"},
            timeout=60
        )
    except Exception as e:
        pass

    return doc


# --------------------------------------------------
# GET ALL DOCUMENTS (доступны всем authenticated пользователям)
# --------------------------------------------------
@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить список всех активных документов (доступно employee и HR)"""
    # Возвращаем только активные документы (current_version установлена)
    return document_crud.list_active_documents(db)


# --------------------------------------------------
# GET DOCUMENT BY ID (доступен всем authenticated пользователям)
# --------------------------------------------------
@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить информацию о документе (доступно employee и HR)"""
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


# --------------------------------------------------
# GET DOCUMENT FULL TEXT (получить полный текст документа)
# --------------------------------------------------
@router.get("/{doc_id}/content")
def get_document_content(
    doc_id: int,
    version_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить полный текст документа (по ТЗ пользователь может запросить полный документ)
    
    Parameters:
    - doc_id: ID документа
    - version_id: ID конкретной версии (опционально, по умолчанию текущая активная версия)
    """
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Если указана конкретная версия
    if version_id:
        version = document_crud.get_document_version(db, doc_id, version_id)
        if not version:
            raise HTTPException(404, "Document version not found")
    else:
        # Используем текущую активную версию
        version = doc.current_version
        if not version:
            raise HTTPException(404, "Document has no active version")
    
    # Возвращаем содержимое в зависимости от формата
    if version.content:
        return {
            "document_id": doc_id,
            "version_id": version.id,
            "title": doc.title,
            "format": version.format.value,
            "content": version.content,
            "created_at": version.created_at
        }
    elif version.file_path:
        # Для файлов возвращаем путь (фронтенд скачивает отдельно)
        return {
            "document_id": doc_id,
            "version_id": version.id,
            "title": doc.title,
            "format": version.format.value,
            "file_path": version.file_path,
            "created_at": version.created_at
        }
    else:
        raise HTTPException(500, "Document has no content or file")



# --------------------------------------------------
# GET DOCUMENT VERSIONS (история версий)
# --------------------------------------------------
@router.get("/{doc_id}/versions")
def get_document_versions(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить историю всех версий документа"""
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    
    return {
        "document_id": doc_id,
        "title": doc.title,
        "versions": [
            {
                "version_id": v.id,
                "format": v.format.value,
                "sync_status": v.sync_status.value,
                "created_at": v.created_at,
                "is_current": v.id == doc.current_version_id
            }
            for v in doc.versions
        ]
    }


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    version_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Скачивание файла документа (текущей или конкретной версии)
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    
    if version_id:
        version = document_crud.get_document_version(db, doc_id, version_id)
        if not version:
            raise HTTPException(404, "Document version not found")
    else:
        version = doc.current_version
        if not version:
            raise HTTPException(404, "Document has no active version")
    
    if not version.file_path or not Path(version.file_path).exists():
        raise HTTPException(404, "File not found")
    
    return FileResponse(
        path=version.file_path,
        filename=Path(version.file_path).name,
        media_type="application/octet-stream"
    )


@router.put("/{doc_id}", response_model=DocumentResponse)
def update_document(doc_id: int, data: DocumentUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(require_role('hr', 'admin'))):
    doc = document_crud.update_document(db, doc_id, data)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


# --------------------------------------------------
# DELETE DOCUMENT
# --------------------------------------------------
@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(require_role('hr', 'admin'))):
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Перед удалением из БД удаляем все версии из RAG
    try:
        for version in doc.versions:
            requests.delete(
                f"{settings.RAG_URL}/rag/sync/document/{doc_id}/version/{version.id}",
                headers={"X-Role": "admin"},
                timeout=30
            )
    except Exception as e:
        pass
    
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
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Добавить новую версию к существующему документу"""
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    # Проверка расширения файла
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_FORMATS:
        raise HTTPException(
            400,
            f"Unsupported file format. Allowed: {', '.join(ALLOWED_FORMATS)}"
        )

    version_number = len(doc.versions) + 1
    doc_dir = f"{FILES_ROOT}/{doc.id}/{version_number}"
    os.makedirs(doc_dir, exist_ok=True)
    file_path = f"{doc_dir}/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    version = DocumentVersionCreate(format=format, file_path=file_path)
    doc = document_crud.add_document_version(db, doc_id, version)
    
    try:
        requests.post(
            f"{settings.RAG_URL}/rag/sync/document",
            json={
                "document_id": doc.id,
                "version_id": doc.current_version_id,
                "title": doc.title,
                "file_path": file_path
            },
            headers={"X-Role": "admin"},
            timeout=60
        )
    except Exception as e:
        pass
    
    return doc

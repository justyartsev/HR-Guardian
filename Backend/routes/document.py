import os
import requests
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from starlette.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import crud.document as document_crud
from dependencies.user import get_current_user, require_role
from models.user import User as UserModel
from models.document import Document, DocumentVersion
from core.mime_config import get_mime_by_format
from core.file_utils import sanitize_filename
from schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentResponse
)
from core.enums import DocumentFormat, SyncStatus, AccessLevel, UserRole
from core.document_sync import sync_version_to_rag
from typing import List, Optional
from core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

# Допустимые форматы файлов (обработка в RAG: txt, docx с таблицами, md, pdf с OCR)
# .wiki и .faq удалены, т.к. для них нет обработчиков в RAG. Для FAQ используйте Markdown (.md)
ALLOWED_FORMATS = {'.txt', '.pdf', '.docx', '.md'}



@router.post("/", response_model=DocumentResponse)
async def create_document(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin')),
    title: Optional[str] = Form(None),
    effective_from: Optional[str] = Form(None),
    access_level: Optional[str] = Form("all"),
    format: Optional[str] = Form(None),
    change_comment: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Создать новый документ или добавить версию к существующему (только HR/admin)"""
    # Проверка файла
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Файл не прикреплен")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат. Допустимые: {', '.join(ALLOWED_FORMATS)}")

    # Определяем title и format
    title = title.strip() if title and title.strip() else Path(file.filename).stem

    if not format or not format.strip():
        format_map = {'.txt': DocumentFormat.TEXT, '.pdf': DocumentFormat.PDF, '.docx': DocumentFormat.DOCX, '.md': DocumentFormat.MARKDOWN}
        format = format_map.get(file_ext, DocumentFormat.TEXT).value

    # Парсим дату (по умолчанию - сегодняшняя дата)
    effective_from_dt = datetime.utcnow()
    if effective_from and isinstance(effective_from, str) and effective_from.strip():
        try:
            effective_from_dt = datetime.fromisoformat(effective_from.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Неверный формат даты: {effective_from}")

    # Парсим access_level
    try:
        access_level_enum = AccessLevel(access_level) if access_level else AccessLevel.all
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Неверный уровень доступа: {access_level}")

    # Получаем или создаём документ
    existing_doc = document_crud.find_document_by_title(db, title)
    if existing_doc:
        doc = existing_doc
        doc.access_level = access_level_enum
        db.commit()
    else:
        doc_data = DocumentCreate(title=title, access_level=access_level_enum, initial_version=None)
        doc = document_crud.create_empty_document(db, doc_data)

    # Сохраняем файл
    version_number = len(doc.versions) + 1
    content = await file.read()
    file_path = document_crud.save_document_file(content, doc.id, version_number, file.filename)

    # Создаём версию (она остается в PENDING)
    version = DocumentVersionCreate(format=format, file_path=file_path, change_comment=change_comment, effective_from=effective_from_dt)
    doc = document_crud.add_document_version(db, doc.id, version)

    # Немедленная синхронизация если effective_from уже в прошлом
    now = datetime.utcnow()
    if effective_from_dt <= now:
        # Получаем только что созданную версию
        created_version = doc.versions[-1]  # последняя добавленная версия
        print(f"[DOCUMENT_CREATE] Immediate sync for doc {doc.id}, version {created_version.id}", flush=True)
        success, message = sync_version_to_rag(db, created_version, doc)
        if not success:
            print(f"[DOCUMENT_CREATE] WARN: Immediate sync failed: {message}", flush=True)

    doc = document_crud.get_document(db, doc.id)
    return doc



@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить список активных документов с учётом уровня доступа.

    - admin/hr: видит все документы (all + hr_only)
    - employee: видит только all
    """
    docs = document_crud.list_active_documents(db)

    if current_user.role in (UserRole.admin, UserRole.hr):
        return docs
    else:
        return [d for d in docs if d.access_level == AccessLevel.all]


@router.get("/pending", response_model=List[DocumentResponse])
def list_pending_documents(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить список документов ожидающих активации"""
    return document_crud.get_pending_documents(db)



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



@router.get("/{doc_id}/content")
def get_document_content(
    doc_id: int,
    version_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить полный текст документа"""
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    if version_id:
        version = document_crud.get_document_version(db, doc_id, version_id)
    else:
        version = document_crud.get_best_version(doc)

    if not version:
        raise HTTPException(404, "Version not found")
    
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
    """Скачать файл документа"""
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    # Если указана конкретная версия
    if version_id:
        version = document_crud.get_document_version(db, doc_id, version_id)
        if not version:
            raise HTTPException(404, "Document version not found")
    else:
        version = document_crud.get_best_version(doc)
        if not version:
            raise HTTPException(404, "Document has no available version")

    if not version.file_path:
        raise HTTPException(400, "This version has no file (only text content)")

    try:
        file_path = Path(version.file_path)
        
        # Если файл не существует по сохранённому пути, пытаемся найти его по ID версии
        if not file_path.exists():
            # Пытаемся найти файл в директории версии по ID
            doc_version_dir = Path(f"{settings.FILES_ROOT}/{doc_id}/{version.id}")
            if doc_version_dir.exists():
                # Ищем первый файл в директории
                files = list(doc_version_dir.iterdir())
                if files:
                    file_path = files[0]
                else:
                    raise HTTPException(404, "File not found on disk")
            else:
                raise HTTPException(404, "File not found on disk")

        # Определяем расширение на основе формата версии
        format_extensions = {
            'txt': '.txt',
            'pdf': '.pdf',
            'docx': '.docx',
            'md': '.md',
            'html': '.html',
            'wiki': '.wiki',
            'faq': '.faq'
        }
        
        format_value = version.format.value if hasattr(version.format, 'value') else str(version.format)
        file_ext = format_extensions.get(format_value, Path(version.file_path).suffix or '.bin')
        
        safe_title = sanitize_filename(doc.title)
        filename_with_ext = f"{safe_title}_v{version.id}{file_ext}"
        
        # Используем централизованный маппинг для MIME-type
        format_value = version.format.value if hasattr(version.format, 'value') else str(version.format)
        mime_type = get_mime_by_format(format_value)

        response = FileResponse(
            path=file_path,
            media_type=mime_type,
            filename=filename_with_ext
        )
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[DOWNLOAD_ERROR] doc_id={doc_id}, version_id={version.id}, error={str(e)}", flush=True)
        print(f"[DOWNLOAD_ERROR] Traceback: {traceback.format_exc()}", flush=True)
        raise HTTPException(500, f"Error downloading file: {str(e)}")


@router.get("/{doc_id}/preview")
def preview_document(
    doc_id: int,
    version_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Предпросмотр документа в браузере"""
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    if version_id:
        version = document_crud.get_document_version(db, doc_id, version_id)
    else:
        version = document_crud.get_best_version(doc)

    if not version:
        raise HTTPException(404, "Version not found")

    if not version.file_path:
        raise HTTPException(400, "This version has no file for preview")

    try:
        file_path = Path(version.file_path)
        if not file_path.exists():
            raise HTTPException(404, "File not found on disk")

        # Определяем MIME-type по расширению файла
        mime_types = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.html': 'text/html',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        file_ext = file_path.suffix.lower()
        media_type = mime_types.get(file_ext, 'application/octet-stream')

        return FileResponse(
            path=file_path,
            filename=file_path.name,
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{file_path.name}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error previewing file: {str(e)}")


@router.get("/{doc_id}/sync-status")
def get_sync_status(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Получить статус синхронизации документа с RAG"""
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    return {
        "document_id": doc_id,
        "title": doc.title,
        "versions": [{
            "version_id": v.id,
            "status": v.sync_status.value,
            "chunks_count": v.total_chunks,
            "created_at": v.created_at
        } for v in doc.versions]
    }


@router.put("/{doc_id}", response_model=DocumentResponse)
def update_document(doc_id: int, data: DocumentUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(require_role('hr', 'admin'))):
    doc = document_crud.update_document(db, doc_id, data)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(require_role('hr', 'admin'))):
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Перед удалением из БД удаляем все версии из RAG
    for version in doc.versions:
        try:
            resp = requests.delete(
                f"{settings.RAG_URL}/rag/sync/document/{doc.id}/version/{version.id}",
                params={"service_token": settings.RAG_SERVICE_TOKEN},
                timeout=30
            )
            if resp.ok:
                result = resp.json()
                print(f"[DELETE] RAG: doc={doc.id} ver={version.id} → {result.get('chunks_deleted', 0)} chunks deleted")
            else:
                print(f"[DELETE] RAG error: doc={doc.id} ver={version.id} → {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[DELETE] RAG exception: doc={doc.id} ver={version.id} → {e}")
    
    ok = document_crud.delete_document(db, doc_id)
    if not ok:
        raise HTTPException(404, "Document not found")
    return {"status": "deleted"}


@router.post("/{doc_id}/versions", response_model=DocumentResponse)
async def add_version(
    doc_id: int,
    format: DocumentFormat = Form(...),
    file: UploadFile = File(...),
    effective_from: Optional[str] = Form(None),  # Дата вступления в силу (ISO format)
    change_comment: Optional[str] = Form(None),  # Комментарий к изменениям
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

    # Парсим дату вступления в силу (по умолчанию - сегодняшняя дата)
    effective_from_dt = datetime.utcnow()
    if effective_from and isinstance(effective_from, str) and effective_from.strip():
        try:
            effective_from_dt = datetime.fromisoformat(effective_from.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Неверный формат даты: {effective_from}")

    version_number = len(doc.versions) + 1
    content = await file.read()
    file_path = document_crud.save_document_file(content, doc.id, version_number, file.filename)

    version = DocumentVersionCreate(
        format=format,
        file_path=file_path,
        change_comment=change_comment,
        effective_from=effective_from_dt
    )
    doc = document_crud.add_document_version(db, doc_id, version)

    # Версия остается PENDING
    # Scheduler отправит в RAG когда наступит effective_from

    return doc


@router.post("/{doc_id}/versions/{version_id}/restore", response_model=DocumentResponse)
def restore_document_version(
    doc_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Восстановить старую версию документа как текущую (только HR/admin)

    Процесс восстановления:
    1. Проверяет, что версия существует и принадлежит документу
    2. Если версия не синхронизирована с RAG, сначала синхронизирует её
    3. Удаляет текущую версию из RAG (если есть)
    4. Устанавливает восстанавливаемую версию как current_version_id
    5. Возвращает обновлённый документ
    """
    # Получаем документ
    doc = document_crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    # Находим версию для восстановления
    target_version = None
    for v in doc.versions:
        if v.id == version_id:
            target_version = v
            break

    if not target_version:
        raise HTTPException(404, f"Version {version_id} not found in document {doc_id}")

    # Проверяем, не является ли эта версия уже текущей
    if doc.current_version_id == version_id:
        raise HTTPException(400, "This version is already the current version")

    # Если версия не синхронизирована с RAG, сначала синхронизируем
    if target_version.sync_status != SyncStatus.SYNCED:
        success, message = sync_version_to_rag(db, target_version, doc)

        if not success:
            raise HTTPException(500, f"Failed to sync version with RAG: {message}")

    # Если была текущая версия, удаляем её из RAG
    if doc.current_version_id and doc.current_version_id != version_id:
        old_version = doc.current_version
        if old_version:
            try:
                requests.delete(
                    f"{settings.RAG_URL}/rag/sync/document/{doc_id}/version/{old_version.id}",
                    params={"service_token": settings.RAG_SERVICE_TOKEN},
                    timeout=30
                )
            except Exception:
                pass

    doc.current_version_id = version_id
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/{doc_id}/cancel_update")
def cancel_scheduled_update(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role('hr', 'admin'))
):
    """Отменить запланированное обновление документа"""
    cancelled = document_crud.cancel_pending_versions(db, doc_id)

    if cancelled == 0:
        raise HTTPException(400, "No pending updates to cancel")

    return {
        "status": "success",
        "document_id": doc_id,
        "cancelled_versions": cancelled,
        "message": f"Отменено обновлений: {cancelled}"
    }

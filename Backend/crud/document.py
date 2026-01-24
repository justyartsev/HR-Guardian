from sqlalchemy.orm import Session
from models.document import Document, DocumentVersion
from schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentVersionCreate
)
from core.enums import SyncStatus, AccessLevel
from core.config import settings
from core.file_utils import sanitize_filename
from datetime import datetime
import os
import shutil

# Поиск документа по названию (для версионирования)
def find_document_by_title(db: Session, title: str):
    """Ищет документ по названию только (для правильного версионирования)"""
    return db.query(Document).filter(Document.title == title).first()


def get_document(db: Session, doc_id: int):
    return db.query(Document).filter(Document.id == doc_id).first()



def update_document(db: Session, doc_id: int, data: DocumentUpdate):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return None

    if data.title is not None:
        doc.title = data.title

    if data.access_level is not None:
        doc.access_level = data.access_level

    db.commit()
    db.refresh(doc)
    return doc



def delete_document(db: Session, doc_id: int):
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return False

        # Удаляем файлы с диска
        doc_folder = f"{settings.FILES_ROOT}/{doc_id}"
        if os.path.exists(doc_folder):
            shutil.rmtree(doc_folder)

        # Сначала очищаем current_version_id чтобы избежать constraint violation
        doc.current_version_id = None
        db.flush()

        # Удаляем версии из БД
        db.query(DocumentVersion).filter(DocumentVersion.document_id == doc_id).delete()

        # Удаляем сам документ
        db.delete(doc)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting document: {e}")
        return False



def add_document_version(db: Session, doc_id: int, data: DocumentVersionCreate):
    """Добавить новую версию к документу"""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return None

    v = DocumentVersion(
        document_id=doc.id,
        format=data.format,
        content=data.content,
        file_path=data.file_path,
        change_comment=data.change_comment,
        effective_from=data.effective_from,
        sync_status=SyncStatus.PENDING
    )

    db.add(v)
    db.flush()
    db.commit()
    db.refresh(doc)
    return doc

def create_empty_document(db: Session, data: DocumentCreate):
    """Создать пустой документ без версий

    Документ неактивен (current_version_id = NULL) до синхронизации первой версии
    """
    doc = Document(
        title=data.title,
        access_level=data.access_level if data.access_level else AccessLevel.all
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def update_version_sync(db: Session, version_id: int, chunks_created: int):
    """Обновление статуса синхронизации версии документа

    Когда версия синхронизирована:
    1. Меняем статус SYNCING → SYNCED
    2. Устанавливаем эту версию как current ТОЛЬКО если effective_from <= now
    3. Старые версии становятся ARCHIVED
    4. Возвращаем список старых версий для удаления из RAG
    
    ВАЖНО: Версия с будущей effective_from остаётся в SYNCED но не становится текущей!
    Она станет текущей через scheduler когда наступит effective_from.
    """
    from models.document import DocumentVersion, SyncStatus

    v = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not v:
        raise ValueError(f"DocumentVersion id={version_id} not found")

    # Обновляем версию как успешно синхронизированную
    v.total_chunks = chunks_created
    v.sync_status = SyncStatus.SYNCED if chunks_created and chunks_created > 0 else SyncStatus.ERROR
    
    old_versions = []
    
    # Если успешно синхронизировано - проверяем эффективность даты
    if v.sync_status == SyncStatus.SYNCED:
        doc = v.document
        now = datetime.utcnow()
        
        # ТОЛЬКО если effective_from уже наступила - делаем версию текущей
        if v.effective_from is None or v.effective_from <= now:
            doc.current_version_id = version_id
            
            # Архивируем все старые версии этого документа
            old_versions = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == doc.id,
                DocumentVersion.id != version_id,
                DocumentVersion.sync_status != SyncStatus.ARCHIVED
            ).all()
            
            for old_v in old_versions:
                old_v.sync_status = SyncStatus.ARCHIVED
    
    db.commit()
    db.refresh(v)
    
    # Возвращаем данные для удаления старых версий из RAG
    return v, [(ov.document_id, ov.id) for ov in old_versions]


def list_active_documents(db: Session):
    """
    Получить все документы, которые видны пользователям:
    - Имеют установленную текущую версию (current_version_id) с наступившей датой
    """
    from sqlalchemy import or_

    now = datetime.utcnow()

    # Получаем только документы с установленным current_version_id
    # Это означает что документ был успешно синхронизирован и активен
    return db.query(Document).join(
        DocumentVersion,
        DocumentVersion.id == Document.current_version_id
    ).filter(
        Document.current_version_id.isnot(None),
        or_(
            DocumentVersion.effective_from.is_(None),
            DocumentVersion.effective_from <= now
        )
    ).all()


def get_document_version(db: Session, doc_id: int, version_id: int):
    """Получить конкретную версию документа"""
    return db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc_id,
        DocumentVersion.id == version_id
    ).first()


def get_best_version(document):
    """Получить лучшую доступную версию документа

    Приоритет: current_version → последняя SYNCED → последняя с контентом
    """
    if document.current_version:
        return document.current_version

    if not document.versions:
        return None

    # Ищем последнюю SYNCED версию
    synced_versions = [v for v in document.versions if v.sync_status == SyncStatus.SYNCED]
    if synced_versions:
        return max(synced_versions, key=lambda v: v.created_at)

    # Fallback: последняя версия с файлом или контентом
    versions_with_content = [v for v in document.versions if v.file_path or v.content]
    if versions_with_content:
        return max(versions_with_content, key=lambda v: v.created_at)

    return None


def get_pending_documents(db: Session):
    """Получить документы ожидающие активации
    
    Документ показывается если у него есть хотя бы одна PENDING версия,
    независимо есть ли текущая версия или нет.
    """
    return db.query(Document).join(
        DocumentVersion,
        DocumentVersion.document_id == Document.id
    ).filter(
        DocumentVersion.sync_status == SyncStatus.PENDING
    ).distinct().all()


def save_document_file(file_content: bytes, doc_id: int, version_number: int, filename: str) -> str:
    """Сохранить файл документа на диск

    Returns: путь к сохранённому файлу
    """
    # Используем унифицированную функцию для очистки имени файла
    safe_filename = sanitize_filename(filename)
    if not safe_filename:
        safe_filename = f"document_{doc_id}_{version_number}"
    
    doc_dir = f"{settings.FILES_ROOT}/{doc_id}/{version_number}"
    os.makedirs(doc_dir, exist_ok=True)
    file_path = f"{doc_dir}/{safe_filename}"

    with open(file_path, "wb") as f:
        f.write(file_content)

    return file_path


def cancel_pending_versions(db: Session, doc_id: int) -> int:
    """Отменить запланированные обновления документа

    Удаляет PENDING версии и их файлы
    Returns: количество отменённых версий
    """
    doc = get_document(db, doc_id)
    if not doc:
        return 0

    pending_versions = [v for v in doc.versions if v.sync_status == SyncStatus.PENDING]
    if not pending_versions:
        return 0

    cancelled = 0
    for version in pending_versions:
        try:
            if version.file_path and os.path.exists(version.file_path):
                version_dir = os.path.dirname(version.file_path)
                if os.path.exists(version_dir):
                    shutil.rmtree(version_dir)

            db.delete(version)
            cancelled += 1
        except Exception:
            pass

    db.commit()
    return cancelled

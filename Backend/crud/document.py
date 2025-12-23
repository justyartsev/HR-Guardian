from sqlalchemy.orm import Session
from models.document import Document, DocumentVersion
from schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentVersionCreate
)
from core.enums import SyncStatus
from datetime import datetime
import os
import shutil

# Поиск документа по названию и формату (для версионирования)
def find_document_by_title_and_format(db: Session, title: str, format):
    docs = db.query(Document).filter(Document.title == title).all()
    for doc in docs:
        for v in doc.versions:
            # Сравниваем значения format (могут быть enum или строка)
            if str(v.format) == str(format):
                return doc
    return None


def get_document(db: Session, doc_id: int):
    return db.query(Document).filter(Document.id == doc_id).first()



def update_document(db: Session, doc_id: int, data: DocumentUpdate):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return None

    if data.title is not None:
        doc.title = data.title

    if data.effective_from is not None:
        doc.effective_from = data.effective_from

    db.commit()
    db.refresh(doc)
    return doc



def delete_document(db: Session, doc_id: int):
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return False

        # Удаляем файлы с диска
        doc_folder = f"./files/documents/{doc_id}"
        if os.path.exists(doc_folder):
            shutil.rmtree(doc_folder)  # Рекурсивное удаление папки со всеми версиями

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
    """Добавить новую версию к документу """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return None

    v = DocumentVersion(
        document_id=doc.id,
        format=data.format,
        content=data.content,
        file_path=data.file_path,
    )

    db.add(v)
    db.flush()

    # Не активируем автоматически! current_version_id остается как есть
    # Версия будет активирована scheduler'ом когда наступит effective_from
    # и версия будет синхронизирована (sync_status = SYNCED)

    db.commit()
    db.refresh(doc)
    return doc

def create_empty_document(db: Session, data: DocumentCreate):
    """Создать пустой документ без версий
    
    Документ останется неактивным (current_version_id = NULL) пока:
    1. Не будет добавлена хотя бы одна версия
    2. Версия не будет синхронизирована с RAG
    3. Наступит дата effective_from (если установлена)
    """
    doc = Document(
        title=data.title,
        effective_from=data.effective_from
        # current_version_id остается NULL - неактивен
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def update_version_sync(db: Session, version_id: int, chunks_created: int):
    """Update sync status, total_chunks and synced_at for a document version.
    
    Когда версия синхронизирована:
    1. Меняем статус SYNCING → SYNCED
    2. Устанавливаем эту версию как current (текущая)
    3. Старые версии становятся ARCHIVED
    4. Возвращаем список старых версий для удаления из RAG
    """
    from models.document import DocumentVersion, SyncStatus
    from datetime import datetime

    v = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not v:
        raise ValueError(f"DocumentVersion id={version_id} not found")

    # Обновляем версию как успешно синхронизированную
    v.total_chunks = chunks_created
    v.synced_at = datetime.utcnow()
    v.sync_status = SyncStatus.SYNCED if chunks_created and chunks_created > 0 else SyncStatus.ERROR
    
    old_versions = []
    
    # Если успешно синхронизировано - делаем текущей и архивируем старые
    if v.sync_status == SyncStatus.SYNCED:
        doc = v.document
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
    - Имеют установленную текущую версию
    - Дата effective_from либо не установлена, либо уже наступила
    """
    now = datetime.utcnow()
    return db.query(Document).filter(
        Document.current_version_id.isnot(None),
        ((Document.effective_from.isnot(None)) & (Document.effective_from <= now)) |
        (Document.effective_from.is_(None))
    ).all()


def get_document_version(db: Session, doc_id: int, version_id: int):
    """Получить конкретную версию документа"""
    return db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc_id,
        DocumentVersion.id == version_id
    ).first()

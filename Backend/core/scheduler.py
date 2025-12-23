from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from database import SessionLocal
from models.document import Document, DocumentVersion
from datetime import datetime

logger = None

scheduler = BackgroundScheduler()


def activate_pending_documents():
    """
    Scheduler: отправляет документы в RAG когда наступает effective_from
    
    Логика:
    1. Ищет документы без active версии (current_version_id IS NULL)
    2. Проверяет effective_from <= текущее время
    3. Ищет PENDING версию (не отправляли в RAG еще)
    4. Меняет статус на SYNCING и отправляет в RAG
    5. RAG обработает, старые версии станут ARCHIVED
    """
    from models.document import SyncStatus
    import requests
    
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Ищем документы с наступившей effective_from и PENDING версией
        pending_docs = db.query(Document).join(DocumentVersion).filter(
            Document.current_version_id.is_(None),
            Document.effective_from.isnot(None),
            Document.effective_from <= now,
            DocumentVersion.sync_status == SyncStatus.PENDING
        ).all()
        
        for doc in pending_docs:
            # Получаем PENDING версию
            pending_version = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == doc.id,
                DocumentVersion.sync_status == SyncStatus.PENDING
            ).order_by(DocumentVersion.created_at).first()
            
            if pending_version:
                # Меняем статус на SYNCING
                pending_version.sync_status = SyncStatus.SYNCING
                db.commit()
                
                # Отправляем в RAG
                try:
                    from core.config import settings
                    requests.post(
                        f"{settings.RAG_URL}/rag/sync/document",
                        json={
                            "document_id": doc.id,
                            "version_id": pending_version.id,
                            "title": doc.title,
                            "file_path": pending_version.file_path
                        },
                        headers={"X-Role": "admin"},
                        timeout=60
                    )
                    print(f"[SCHEDULER] ✓ Отправлен документ {doc.id} версия {pending_version.id} в RAG")
                except Exception as e:
                    # Если RAG недоступна - возвращаем статус PENDING
                    pending_version.sync_status = SyncStatus.PENDING
                    db.commit()
                    print(f"[SCHEDULER] ⚠ Ошибка отправки в RAG: {e}")
        
        if pending_docs:
            print(f"[SCHEDULER] Обработано {len(pending_docs)} документов")
        
    except Exception as e:
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Запустить scheduler при старте приложения"""
    if not scheduler.running:
        # Проверяем каждый час
        scheduler.add_job(
            activate_pending_documents,
            trigger=IntervalTrigger(hours=1),
            id='activate_documents',
            name='Activate pending documents',
            replace_existing=True
        )
        scheduler.start()


def stop_scheduler():
    """Остановить scheduler при выключении приложения"""
    if scheduler.running:
        scheduler.shutdown()

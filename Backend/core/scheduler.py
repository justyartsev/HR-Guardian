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
    Ищет документы, у которых:
    1. Нет текущей версии (current_version_id IS NULL)
    2. Есть дата effective_from и она уже наступила
    3. Есть хотя бы одна версия
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Ищем документы к активации
        pending_docs = db.query(Document).filter(
            Document.current_version_id.is_(None),
            Document.effective_from.isnot(None),
            Document.effective_from <= now
        ).all()
        
        for doc in pending_docs:
            # Берем первую версию (самую старую)
            first_version = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == doc.id
            ).order_by(DocumentVersion.created_at).first()
            
            if first_version:
                doc.current_version_id = first_version.id
        
        if pending_docs:
            db.commit()
        
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

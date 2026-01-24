"""
Scheduler для автоматической активации документов.
Каждую минуту проверяет документы с наступившей effective_from датой и отправляет их в RAG.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from database import SessionLocal
from models.document import Document, DocumentVersion
from core.enums import SyncStatus
from core.document_sync import sync_version_to_rag
from datetime import datetime

scheduler = BackgroundScheduler()


def activate_pending_documents():
    """
    Находит версии документов с наступившей датой effective_from
    и отправляет их в RAG для синхронизации.

    PENDING документы могут быть отправлены повторно - RAG идемпотентен.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        print(f"[SCHEDULER] Running at {now}. Checking for pending documents...", flush=True)

        # Ищем версии с наступившей датой effective_from и статусом PENDING
        pending_versions = db.query(DocumentVersion).join(
            Document,
            DocumentVersion.document_id == Document.id
        ).filter(
            DocumentVersion.sync_status == SyncStatus.PENDING,
            DocumentVersion.effective_from <= now
        ).all()

        print(f"[SCHEDULER] Found {len(pending_versions)} pending versions to activate", flush=True)

        if not pending_versions:
            return

        # Логируем найденные документы
        for v in pending_versions:
            print(f"[SCHEDULER] - Doc {v.document_id}, Version {v.id}, effective_from: {v.effective_from}", flush=True)

        # Синхронизируем каждую версию с RAG
        for version in pending_versions:
            doc = version.document
            print(f"[SCHEDULER] Activating doc {doc.id} (version {version.id})", flush=True)

            success, message = sync_version_to_rag(db, version, doc)

            if not success:
                print(f"[SCHEDULER] WARN: Failed to sync: {message}", flush=True)

    except Exception as e:
        print(f"[SCHEDULER] ERROR: {e}", flush=True)
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Запустить scheduler при старте приложения."""
    if not scheduler.running:
        scheduler.add_job(
            activate_pending_documents,
            trigger=IntervalTrigger(minutes=1),
            id='activate_documents',
            name='Activate pending documents',
            replace_existing=True
        )
        scheduler.start()
        print("[SCHEDULER] Started! Running every 1 minute to activate pending documents", flush=True)


def stop_scheduler():
    """Остановить scheduler при выключении приложения."""
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Stopped", flush=True)

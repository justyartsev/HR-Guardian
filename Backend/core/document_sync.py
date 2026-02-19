"""
Модуль для синхронизации документов с RAG системой.
Содержит общую логику отправки документов в RAG без дублирования кода.
"""
import requests
import io
from pathlib import Path
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from models.document import Document, DocumentVersion
from core.enums import SyncStatus
from core.config import settings


def sync_version_to_rag(
    db: Session,
    version: DocumentVersion,
    document: Optional[Document] = None
) -> Tuple[bool, str]:
    """
    Синхронизирует версию документа с RAG системой.

    Args:
        db: Database session
        version: DocumentVersion для синхронизации
        document: Document (опционально, будет загружен если не передан)

    Returns:
        Tuple[success: bool, message: str]
    """
    if not document:
        document = version.document

    if not document:
        return False, "Document not found"

    # Проверяем наличие файла
    if not version.file_path:
        return False, "No file path"

    # Читаем файл
    try:
        with open(version.file_path, 'rb') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"[SYNC] ERROR: File not found: {version.file_path}", flush=True)
        return False, f"File not found: {version.file_path}"
    except Exception as e:
        print(f"[SYNC] ERROR: File read error: {e}", flush=True)
        return False, f"File read error: {str(e)}"

    # Проверяем что файл не пустой
    if not content:
        print(f"[SYNC] ERROR: File is empty", flush=True)
        return False, "File is empty"

    # Подготавливаем данные для отправки в RAG
    # Статус остается PENDING до получения callback от RAG
    file_name = Path(version.file_path).name
    files = {'file': (file_name, io.BytesIO(content))}
    data = {
        'document_id': str(document.id),
        'version_id': str(version.id),
        'title': document.title,
        'access_level': document.access_level.value if document.access_level else 'all',
        'service_token': settings.RAG_SERVICE_TOKEN,
        'callback_token': settings.RAG_CALLBACK_SECRET
    }

    # Отправляем в RAG
    try:
        response = requests.post(
            f"{settings.RAG_URL}/rag/sync/document",
            files=files,
            data=data,
            timeout=60
        )

        if response.status_code == 200:
            print(f"[SYNC] OK: Document {document.id}, Version {version.id} sent to RAG successfully", flush=True)
            return True, "Sent to RAG successfully"
        else:
            # При ошибке RAG возвращаем статус обратно в PENDING для повторной попытки
            print(f"[SYNC] ERROR: RAG returned {response.status_code}", flush=True)
            version.sync_status = SyncStatus.PENDING
            db.commit()
            return False, f"RAG returned {response.status_code}"

    except requests.exceptions.Timeout:
        print(f"[SYNC] ERROR: Timeout while sending to RAG", flush=True)
        version.sync_status = SyncStatus.PENDING
        db.commit()
        return False, "RAG request timeout"

    except Exception as e:
        print(f"[SYNC] ERROR: Sync error: {e}", flush=True)
        version.sync_status = SyncStatus.PENDING
        db.commit()
        return False, f"Sync error: {str(e)}"


def read_file_content(file_path: str) -> Tuple[bool, Optional[bytes], str]:
    """
    Читает содержимое файла.

    Returns:
        Tuple[success: bool, content: Optional[bytes], error_message: str]
    """
    try:
        with open(file_path, 'rb') as f:
            content = f.read()

        if not content:
            return False, None, "File is empty"

        return True, content, ""

    except FileNotFoundError:
        return False, None, f"File not found: {file_path}"
    except Exception as e:
        return False, None, f"File read error: {str(e)}"

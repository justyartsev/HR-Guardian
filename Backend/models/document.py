from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from database import Base
from schemas.document import DocumentFormat

# Статусы синхронизации версии документа с RAG системой
class SyncStatus(enum.Enum):
    PENDING = "pending"  # ожидает синхронизации с RAG
    SYNCED = "synced"    # успешно синхронизирован
    SYNCING = "syncing"  # в процессе синхронизации
    ERROR = "error"      # ошибка при синхронизации


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)

    # дата вступления в силу
    effective_from = Column(DateTime, nullable=True)

    # текущая версия
    current_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)

    # связь с версионностью
    versions = relationship("DocumentVersion", back_populates="document", foreign_keys="DocumentVersion.document_id")

    # доступ к текущей версии
    current_version = relationship("DocumentVersion", foreign_keys=[current_version_id], viewonly=True)


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)

    # формат: PDF, DOCX, MD, TXT, HTML, WIKI, FAQ
    format = Column(Enum(DocumentFormat), nullable=False)

    # текстовые документы храним в базе
    content = Column(Text, nullable=True)

    # бинарные файлы (pdf/docx) храним как путь
    file_path = Column(String(500), nullable=True)

    # статус синхронизации с RAG системой
    sync_status = Column(Enum(SyncStatus), default=SyncStatus.PENDING, nullable=False)

    # время последней синхронизации с RAG
    synced_at = Column(DateTime, nullable=True)

    # количество чанков, созданных в RAG (для отслеживания)
    total_chunks = Column(Integer, nullable=True)

    # дата загрузки/обновления
    created_at = Column(DateTime, default=datetime.utcnow)

    # связь с документом
    document = relationship("Document", back_populates="versions", foreign_keys=[document_id])

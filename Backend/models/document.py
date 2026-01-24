from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from core.enums import DocumentFormat, SyncStatus, AccessLevel


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    access_level = Column(Enum(AccessLevel), default=AccessLevel.all, nullable=False, index=True)
    current_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)

    versions = relationship("DocumentVersion", back_populates="document", foreign_keys="DocumentVersion.document_id")
    current_version = relationship("DocumentVersion", foreign_keys=[current_version_id], viewonly=True)


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    format = Column(Enum(DocumentFormat), nullable=False)
    content = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    sync_status = Column(Enum(SyncStatus), default=SyncStatus.PENDING, nullable=False, index=True)
    total_chunks = Column(Integer, nullable=True)

    # Поля из ТЗ (Сценарий 1)
    change_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), index=True)
    effective_from = Column(DateTime, nullable=True, index=True)

    document = relationship("Document", back_populates="versions", foreign_keys=[document_id])

    @property
    def display_status(self) -> str:
        """Человекочитаемый статус версии"""
        is_current = self.document and self.document.current_version_id == self.id

        if self.sync_status == SyncStatus.ERROR:
            return "Ошибка"
        elif self.sync_status == SyncStatus.PENDING:
            if self.effective_from and self.effective_from > datetime.utcnow():
                return "Ожидает активации"
            return "Ожидает обработки"
        elif self.sync_status == SyncStatus.ARCHIVED:
            return "Архивная"
        elif self.sync_status == SyncStatus.SYNCED:
            return "Актуальная" if is_current else "Архивная"

        return "Неизвестно"

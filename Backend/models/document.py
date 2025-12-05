from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import declarative_base, relationship
import enum
from datetime import datetime

Base = declarative_base()


class DocumentFormat(enum.Enum):
    PDF = "pdf"
    DOCX = "docx"
    MARKDOWN = "md"
    TXT = "txt"
    HTML = "html"
    WIKI = "wiki"
    FAQ = "faq"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)

    # дата вступления в силу
    effective_from = Column(DateTime, nullable=True)

    # текущая версия
    current_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)

    # связь с версионностью
    versions = relationship("DocumentVersion", back_populates="document")

    # доступ к текущей версии
    current_version = relationship("DocumentVersion", foreign_keys=[current_version_id])


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

    # дата загрузки/обновления
    created_at = Column(DateTime, default=datetime.utcnow)

    # связь с документом
    document = relationship("Document", back_populates="versions")

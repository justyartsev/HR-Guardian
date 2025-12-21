from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Dialog(Base):
    __tablename__ = "dialogs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="dialog", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    dialog_id = Column(Integer, ForeignKey("dialogs.id"))
    # отправитель сообщения: "user" или "bot"
    sender = Column(String)
    # текст сообщения
    text = Column(Text)
    # источники документов, использованные для ответа (для bot только)
    # формат: [{"document_id": int, "version_id": int, "chunk_index": int}, ...]
    sources = Column(JSON, nullable=True, default=list)
    # дата создания сообщения
    created_at = Column(DateTime, default=datetime.utcnow)

    dialog = relationship("Dialog", back_populates="messages")

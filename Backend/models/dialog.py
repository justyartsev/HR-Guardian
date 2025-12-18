from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
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
    sender = Column(String)   # "user" или "bot"
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    dialog = relationship("Dialog", back_populates="messages")

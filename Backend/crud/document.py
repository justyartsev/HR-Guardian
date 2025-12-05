from sqlalchemy.orm import Session
from models import Document, DocumentVersion
from schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentVersionCreate
)
from datetime import datetime


def create_document(db: Session, data: DocumentCreate):

    doc = Document(
        title=data.title,
        effective_from=data.effective_from,
    )
    db.add(doc)
    db.flush()  

 
    v = DocumentVersion(
        document_id=doc.id,
        format=data.initial_version.format,
        content=data.initial_version.content,
        file_path=data.initial_version.file_path,
    )
    db.add(v)
    db.flush()

    doc.current_version_id = v.id

    db.commit()
    db.refresh(doc)
    return doc



def get_document(db: Session, doc_id: int):
    return db.query(Document).filter(Document.id == doc_id).first()



def list_documents(db: Session):
    return db.query(Document).all()



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
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return False

    db.query(DocumentVersion).filter(DocumentVersion.document_id == doc_id).delete()

    db.delete(doc)
    db.commit()
    return True



def add_document_version(db: Session, doc_id: int, data: DocumentVersionCreate):
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

    doc.current_version_id = v.id

    db.commit()
    db.refresh(doc)
    return doc

def create_empty_document(db: Session, data: DocumentCreate):
    doc = Document(
        title=data.title,
        effective_from=data.effective_from
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

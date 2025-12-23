from pathlib import Path
from datetime import datetime
from modules.reader import DocumentReader
from modules.chunker import semantic_chunking_vectors, query_vectorizing
import chromadb
import os

BASE_DIR = Path(__file__).parent.parent

client = None
collection = None

reader = DocumentReader()


def init_vectordb(path: str = "vectordb"):
    """Инициализирует Chroma PersistentClient и коллекцию (параметры: path; возвращает: collection)."""
    global client, collection
    if client is None:
        # Резолвим путь относительно RAG если не абсолютный
        db_path = Path(path)
        if not db_path.is_absolute():
            db_path = (BASE_DIR / path).resolve()
        # Создаём папку если её нет
        os.makedirs(db_path, exist_ok=True)
        print(f"[RAG] Initializing Chroma PersistentClient at: {db_path}")
        client = chromadb.PersistentClient(path=str(db_path))
    if collection is None:
        collection = client.get_or_create_collection(name="documents")
    return collection

def sync_document_version(
    document_id: int,
    version_id: int,
    title: str,
    content = None,
    file_path = None,
    effective_date = None
) -> int:
    """Синхронизирует версию документа в Chroma: удаляет старые, добавляет новые чанки (параметры: document_id, version_id, title, content, file_path, effective_date; возвращает: int кол-во добавленных чанков)."""
    if not content and file_path:
        content = reader.read(file_path)

    if not content:
        raise ValueError("Нет содержимого для синхронизации")

    # Инициализируем vectordb если требуется
    try:
        init_vectordb()
    except Exception:
        pass

    chunks, vectors = semantic_chunking_vectors(content)

    # Удаляем старые чанки этой версии ($and фильтр гарантирует правильное удаление)
    old_chunks = collection.get(
        where={
            "$and": [
                {"document_id": {"$eq": document_id}},
                {"version_id": {"$eq": version_id}}
            ]
        }
    )
    if old_chunks.get("ids"):
        collection.delete(ids=old_chunks["ids"])

    # Добавляем новые чанки с метаданными
    ids = [f"doc_{document_id}_v{version_id}_c{i}" for i in range(len(chunks))]
    metadatas = [{
        "document_id": document_id,
        "version_id": version_id,
        "title": title,
        "chunk_index": i,
        "source": file_path or "content_only",
        "effective_date": effective_date or datetime.now().isoformat()
    } for i in range(len(chunks))]

    collection.add(ids=ids, documents=chunks, embeddings=vectors, metadatas=metadatas)

    # Логируем результат
    try:
        client_path = getattr(client, 'persist_directory', None) or getattr(client, 'path', None) or os.getenv('RAG_VECTORDB_PATH', None)
    except Exception:
        client_path = None
    print(f"[RAG] sync_document_version: added {len(chunks)} chunks for document_id={document_id} version_id={version_id} to vectordb={client_path}")
    return len(chunks)


def search(query: str, top_k: int = 5):
    """Семантический поиск в Chroma (параметры: query, top_k; возвращает: matches с метаданными и distance < 0.35)."""
    embedded = query_vectorizing(query)

    results = collection.query(
        query_embeddings=[embedded],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )

    matches = []
    # Фильтруем результаты с порогом семантического сходства 0.35
    for i in range(len(results["ids"][0])):
        if results["distances"][0][i] < 0.35:
            matches.append({
                "document": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i]
            })
    return matches
from pathlib import Path
from datetime import datetime
from modules.reader import DocumentReader
from modules.chunker import semantic_chunking_vectors, query_vectorizing
import chromadb
import os
import numpy as np

BASE_DIR = Path(__file__).parent.parent

client = None
collection = None

reader = DocumentReader()


def reduce_vector_dimensionality(vectors, target_dim=384):
    """Уменьшает размерность векторов с помощью PCA (если нужно)"""
    try:
        if not vectors or len(vectors) == 0:
            return vectors
        
        # Проверяем размерность первого вектора
        if isinstance(vectors[0], (list, tuple)):
            current_dim = len(vectors[0])
        else:
            current_dim = vectors[0].shape[0] if hasattr(vectors[0], 'shape') else 0
        
        # Если размерность уже оптимальная или меньше - возвращаем как есть
        if current_dim <= target_dim:
            return vectors
        
        # Пытаемся использовать PCA для уменьшения размерности
        try:
            from sklearn.decomposition import PCA
            vectors_array = np.array(vectors)
            pca = PCA(n_components=target_dim)
            reduced = pca.fit_transform(vectors_array)
            return reduced.tolist()
        except ImportError:
            # Если scikit-learn не установлен - возвращаем как есть
            return vectors
        except Exception as e:
            return vectors
    except Exception as e:
        # Возвращаем как есть если ошибка
        return vectors


def init_vectordb(path: str = "vectordb"):
    """Инициализирует Chroma PersistentClient."""
    global client, collection
    if client is None:
        # Резолвим путь относительно RAG если не абсолютный
        db_path = Path(path)
        if not db_path.is_absolute():
            db_path = (BASE_DIR / path).resolve()
        # Создаём папку если её нет
        os.makedirs(db_path, exist_ok=True)
        # Простая инициализация без параметров индекса (они не поддерживаются в этой версии)
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
    effective_date = None,
    access_level: str = "all"  # Уровень доступа: all, hr_only, admin_only
) -> int:
    """Синхронизирует версию документа в Chroma."""
    try:
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
        vectors = reduce_vector_dimensionality(vectors)  # Уменьшаем размерность

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
            "effective_date": effective_date or datetime.now().isoformat(),
            "access_level": access_level  # Уровень доступа для фильтрации
        } for i in range(len(chunks))]

        collection.add(ids=ids, documents=chunks, embeddings=vectors, metadatas=metadatas)
        return len(chunks)
    except Exception as e:
        raise


def get_available_documents(user_role: str = "employee"):
    """Получает список всех уникальных документов с учётом уровня доступа.

    Возвращает список словарей: [{"title": "...", "document_id": ...}, ...]
    """
    try:
        init_vectordb()

        # Определяем фильтр по уровню доступа
        if user_role in ("admin", "hr"):
            where_filter = None
        else:
            where_filter = {"access_level": {"$eq": "all"}}

        # Получаем все метаданные
        results = collection.get(
            where=where_filter,
            include=["metadatas"]
        )

        # Извлекаем уникальные документы
        seen_docs = {}
        for meta in results.get("metadatas", []):
            if meta and "document_id" in meta:
                doc_id = meta["document_id"]
                if doc_id not in seen_docs:
                    seen_docs[doc_id] = {
                        "document_id": doc_id,
                        "title": meta.get("title", f"Документ {doc_id}")
                    }

        return list(seen_docs.values())
    except Exception as e:
        print(f"[GET_DOCUMENTS] Error: {e}")
        return []


def search(query: str, top_k: int = 5, user_role: str = "employee"):
    """Семантический поиск в Chroma с фильтрацией по уровню доступа.

    Параметры:
    - query: поисковый запрос
    - top_k: максимальное количество результатов
    - user_role: роль пользователя (admin, hr, employee)

    Логика доступа:
    - admin/hr: видит все документы (all + hr_only)
    - employee: видит только all
    """
    embedded = query_vectorizing(query)

    # Определяем фильтр по уровню доступа
    if user_role in ("admin", "hr"):
        # admin и hr видят всё - нет фильтра
        where_filter = None
    else:
        # employee видит только all
        where_filter = {"access_level": {"$eq": "all"}}

    results = collection.query(
        query_embeddings=[embedded],
        n_results=top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"]
    )

    matches = []
    for i in range(len(results["ids"][0])):
        if results["distances"][0][i] < 1.5:
            matches.append({
                "document": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i]
            })
    return matches
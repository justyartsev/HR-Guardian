from sentence_transformers import SentenceTransformer
from razdel import sentenize
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from contextlib import contextmanager
import os
try:
    import torch
except Exception:
    torch = None

# NOTE:
# - We avoid loading the heavy model at import time to reduce memory footprint.
# - `temporary_model` loads a model for the duration of a `with` block and
#   attempts to release it afterwards (including `torch.cuda.empty_cache()` when available).
# - We keep an optional lightweight `small` model cached for query-time embeddings
#   to keep search latency low; it can be closed via `close_small_model()` when needed.

DEFAULT_EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "intfloat/multilingual-e5-base")

_small_model = None


@contextmanager
def temporary_model(model_name: str = "intfloat/multilingual-e5-base"):
    """Context manager that loads a SentenceTransformer model and releases it afterwards."""
    model = SentenceTransformer(model_name)
    try:
        yield model
    finally:
        try:
            # try to delete references and free CUDA memory if available
            del model
            if torch is not None:
                try:
                    torch.cuda.empty_cache()
                except Exception:
                    pass
        except Exception:
            pass


def semantic_chunking_vectors(
    text: str,
    similarity_threshold: float = 0.6,
    max_sentences_per_chunk: int = 10,
    model_name: str = "intfloat/multilingual-e5-base"
) -> tuple[list[str], list[np.ndarray]]:
    """
    Семантически разбивает текст на чанки и возвращает как сами чанки, так и их усреднённые эмбеддинги.

    :param text: входной текст на русском
    :param model_name: имя модели для эмбеддингов
    :param similarity_threshold: порог косинусного сходства (от 0 до 1)
    :param max_sentences_per_chunk: максимальное число предложений в чанке
    :return: кортеж из двух списков:
             1) список чанков (строк),
             2) список усреднённых эмбеддингов для каждого чанка (numpy arrays)
    """
    # 1. Разбиваем на предложения
    sentences = [sent.text for sent in sentenize(text) if sent.text.strip()]
    if not sentences:
        return [], []

    # 2. Загружаем модель только на время вычисления эмбеддингов
    passage_sentences = [f"passage: {sent}" for sent in sentences]
    with temporary_model(model_name) as model:
        embeddings = model.encode(passage_sentences, normalize_embeddings=True)
    # 3. Формируем чанки и собираем соответствующие им усреднённые эмбеддинги
    chunks = []
    chunk_embeddings = []

    current_chunk_sentences = [sentences[0]]
    current_chunk_embeddings_list = [embeddings[0]] # Список векторов для усреднения

    for i in range(1, len(sentences)):
        new_sent = sentences[i]
        new_emb = embeddings[i]

        # Сравниваем с последним предложением текущего чанка
        similarity = cosine_similarity(current_chunk_embeddings_list[-1].reshape(1, -1), new_emb.reshape(1, -1))[0][0]

        if similarity >= similarity_threshold and len(current_chunk_sentences) < max_sentences_per_chunk:
            current_chunk_sentences.append(new_sent)
            current_chunk_embeddings_list.append(new_emb)
        else:
            # Чанк завершён, сохраняем его
            chunks.append(" ".join(current_chunk_sentences))
            # Усредняем эмбеддинги всех предложений в чанке
            avg_embedding = np.mean(current_chunk_embeddings_list, axis=0)
            chunk_embeddings.append(avg_embedding)

            # Начинаем новый чанк
            current_chunk_sentences = [new_sent]
            current_chunk_embeddings_list = [new_emb]

    # Не забываем про последний чанк
    if current_chunk_sentences:
        chunks.append(" ".join(current_chunk_sentences))
        avg_embedding = np.mean(current_chunk_embeddings_list, axis=0)
        chunk_embeddings.append(avg_embedding)

    return chunks, chunk_embeddings

def _get_small_model(model_name: str | None = None):
    global _small_model
    if model_name is None:
        model_name = DEFAULT_EMBEDDING_MODEL
    if _small_model is None:
        _small_model = SentenceTransformer(model_name)
    return _small_model


def close_small_model():
    """Close and release the cached small model used for query vectorizing."""
    global _small_model
    try:
        del _small_model
    except Exception:
        pass
    _small_model = None
    if torch is not None:
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass


def query_vectorizing(query, model_name: str | None = None):
    """Vectorize a query using the cached model (loaded on demand).

    By default this uses the same embedding model as chunking to ensure
    embedding dimensionality matches the vectors stored in the collection.
    """
    model = _get_small_model(model_name)
    return model.encode(f"query: {query}", normalize_embeddings=True).tolist()
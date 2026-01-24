from sentence_transformers import SentenceTransformer
from razdel import sentenize
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from contextlib import contextmanager
import os
import logging

try:
    import torch
except Exception:
    torch = None

logger = logging.getLogger(__name__)

# Путь к кэшу моделей (берем из переменных окружения или используем дефолтный)
MODELS_CACHE_DIR = os.getenv("HF_HOME", "/app/models_cache")
os.makedirs(MODELS_CACHE_DIR, exist_ok=True)

DEFAULT_EMBEDDING_MODEL = "intfloat/multilingual-e5-base"

_cached_model = None
_cached_model_name = None


def _load_model(model_name: str):
    """Загружает модель из локального кэша. Если модели нет - скачивает автоматически."""
    global _cached_model, _cached_model_name

    # Возвращаем кэшированную модель если она уже загружена
    if _cached_model is not None and _cached_model_name == model_name:
        logger.info(f"✅ Модель {model_name} уже загружена в память")
        return _cached_model

    logger.info(f"Загрузка модели {model_name}...")
    logger.info(f"📁 Кэш директория: {MODELS_CACHE_DIR}")

    # Проверяем есть ли модель в локальном кэше
    model_cache_path = os.path.join(MODELS_CACHE_DIR, f"models--{model_name.replace('/', '--')}")
    logger.info(f"🔍 Проверяем путь: {model_cache_path}")

    model_exists_locally = os.path.exists(model_cache_path)

    if model_exists_locally:
        # Проверяем содержимое директории
        try:
            cache_contents = os.listdir(model_cache_path)
            logger.info(f"📦 Найдены файлы в кэше: {cache_contents}")
        except Exception as e:
            logger.warning(f"⚠️ Не удалось прочитать содержимое кэша: {e}")
    else:
        # Проверяем что вообще есть в MODELS_CACHE_DIR
        try:
            if os.path.exists(MODELS_CACHE_DIR):
                all_models = os.listdir(MODELS_CACHE_DIR)
                logger.info(f"📂 Доступные модели в кэше: {all_models}")
            else:
                logger.warning(f"⚠️ Директория кэша не существует: {MODELS_CACHE_DIR}")
                os.makedirs(MODELS_CACHE_DIR, exist_ok=True)
        except Exception as e:
            logger.warning(f"⚠️ Ошибка чтения директории кэша: {e}")

    try:
        if model_exists_locally:
            # Модель есть в кэше - загружаем БЕЗ проверки обновлений
            logger.info(f"Модель найдена в кэше: {model_cache_path}")

            # Включаем offline режим для HuggingFace
            old_offline = os.environ.get("HF_HUB_OFFLINE")
            old_datasets_offline = os.environ.get("HF_DATASETS_OFFLINE")
            os.environ["HF_HUB_OFFLINE"] = "1"
            os.environ["HF_DATASETS_OFFLINE"] = "1"

            try:
                model = SentenceTransformer(
                    model_name,
                    cache_folder=MODELS_CACHE_DIR,
                    local_files_only=True,
                    trust_remote_code=False
                )
                logger.info(f"✅ Модель {model_name} загружена из локального кэша")
            finally:
                # Восстанавливаем настройки
                if old_offline is None:
                    os.environ.pop("HF_HUB_OFFLINE", None)
                else:
                    os.environ["HF_HUB_OFFLINE"] = old_offline
                if old_datasets_offline is None:
                    os.environ.pop("HF_DATASETS_OFFLINE", None)
                else:
                    os.environ["HF_DATASETS_OFFLINE"] = old_datasets_offline
        else:
            # Модели нет - скачиваем автоматически
            logger.info(f"Модель не найдена в кэше, начинаем скачивание из HuggingFace...")
            model = SentenceTransformer(
                model_name,
                cache_folder=MODELS_CACHE_DIR,
                trust_remote_code=False
            )
            logger.info(f"✅ Модель {model_name} успешно скачана и готова к использованию")
    except Exception as e:
        logger.error(
            f"\n{'='*60}\n"
            f"ОШИБКА ЗАГРУЗКИ МОДЕЛИ!\n"
            f"{'='*60}\n"
            f"Модель: {model_name}\n"
            f"Кэш: {MODELS_CACHE_DIR}\n"
            f"Ошибка: {e}\n\n"
            f"Возможные причины:\n"
            f"1. Нет подключения к интернету (для первой загрузки)\n"
            f"2. Недостаточно места на диске\n"
            f"3. Ошибка HuggingFace API\n"
            f"{'='*60}"
        )
        raise RuntimeError(f"Не удалось загрузить модель {model_name}: {e}")

    # Кэшируем модель в памяти
    _cached_model = model
    _cached_model_name = model_name

    return model


@contextmanager
def temporary_model(model_name: str = "intfloat/multilingual-e5-base"):
    """Возвращает SentenceTransformer модель (кэшируется в памяти)."""
    model = _load_model(model_name)
    try:
        yield model
    finally:
        # Модель остаётся в кэше, не удаляем её
        pass


def semantic_chunking_vectors(
    text: str,
    similarity_threshold: float = 0.6,
    max_sentences_per_chunk: int = 10,
    model_name: str = "intfloat/multilingual-e5-base"
) -> tuple[list[str], list[np.ndarray]]:
    """Семантически разбивает текст на чанки и возвращает чанки + усреднённые embeddings (параметры: text, similarity_threshold, max_sentences_per_chunk, model_name; возвращает: (chunks, embeddings))."""
    # Разбиваем на предложения
    sentences = [sent.text for sent in sentenize(text) if sent.text.strip()]
    if not sentences:
        return [], []

    # Кодируем предложения с префиксом для семантического поиска
    passage_sentences = [f"passage: {sent}" for sent in sentences]
    with temporary_model(model_name) as model:
        embeddings = model.encode(passage_sentences, normalize_embeddings=True)
    # Формируем чанки и собираем усреднённые embeddings
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
            # Усредняем embeddings всех предложений в чанке
            avg_embedding = np.mean(current_chunk_embeddings_list, axis=0)
            chunk_embeddings.append(avg_embedding)

            # Начинаем новый чанк
            current_chunk_sentences = [new_sent]
            current_chunk_embeddings_list = [new_emb]

    # Сохраняем последний чанк
    if current_chunk_sentences:
        chunks.append(" ".join(current_chunk_sentences))
        avg_embedding = np.mean(current_chunk_embeddings_list, axis=0)
        chunk_embeddings.append(avg_embedding)

    return chunks, chunk_embeddings

def close_small_model():
    """Освобождает кэшированную модель и память CUDA (параметры: нет; возвращает: None)."""
    global _cached_model, _cached_model_name
    try:
        del _cached_model
    except Exception:
        pass
    _cached_model = None
    _cached_model_name = None
    if torch is not None:
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass


def query_vectorizing(query, model_name: str | None = None):
    """Кодирует query в embedding с префиксом query: (параметры: query, model_name; возвращает: list float)."""
    if model_name is None:
        model_name = DEFAULT_EMBEDDING_MODEL
    model = _load_model(model_name)
    return model.encode(f"query: {query}", normalize_embeddings=True).tolist()
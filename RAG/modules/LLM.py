from openai import OpenAI

# Подключение к Ollama (локальный LLM)
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
MODEL = "gemma2:2b"

# Системное сообщение для LLM
SYSTEM_MESSAGE = (
    "Вы — внутренний ассистент HR. Никогда не разглашайте и не добавляйте персональные данные пользователя, "
    "если это не строго необходимо. Не запрашивайте PII. Используйте только переданные вам вырезанные фрагменты "
    "документов и отдавайте краткий, полезный ответ. Если ответ требует передачи PII — откажите и предложите обратиться к HR."
)

def answer(prompt: str, chunks: list[str] = None, sources: list[str] = None) -> str:
    """
    Генерирует ответ LLM на основе готового промпта.
    Prompts уже сформированы в query.py с контекстом диалога и чанками.
    
    Args:
        prompt: готовый промпт с вопросом и контекстом из документов
        chunks: не используется (для совместимости)
        sources: не используется (для совместимости)
    
    Returns:
        Ответ модели (UTF-8 строка)
    """
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_MESSAGE},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        return ensure_utf8(response.choices[0].message.content.strip())
    except Exception as e:
        return f"Ошибка при обработке: {str(e)}"


def ensure_utf8(text: str) -> str:
    """Нормализует UTF-8 кодировку (критично для Windows и кириллицы)."""
    if isinstance(text, str):
        return text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
    return text
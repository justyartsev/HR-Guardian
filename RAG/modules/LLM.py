from openai import OpenAI

# Подключение к Ollama (локальный LLM на localhost:11434)
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
MODEL = "gemma2:2b"

# Системное сообщение: запретить утечку персональных данных
SYSTEM_MESSAGE = (
    "Вы — внутренний ассистент HR. Никогда не разглашайте и не добавляйте персональные данные пользователя, "
    "если это не строго необходимо. Не запрашивайте PII. Используйте только переданные вам вырезанные фрагменты "
    "документов и отдавайте краткий, полезный ответ. Если ответ требует передачи PII — откажите и предложите обратиться к HR."
)

def answer(prompt: str, chunks: list[str] = None, sources: list[str] = None) -> str:
    """Генерирует ответ LLM (параметры: prompt, chunks, sources; возвращает: str ответ)."""
    # prompt уже содержит контекст диалога и документы (сформирован в query.py)
    max_retries = 1
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_MESSAGE},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Низкая температура = детерминированный ответ
                max_tokens=300,
                timeout=30  # Защита от зависания ollama
            )
            return ensure_utf8(response.choices[0].message.content.strip())
        except Exception as e:
            if attempt < max_retries:
                print(f"[RAG LLM] Retry attempt {attempt + 1}/{max_retries}: {str(e)}")
            else:
                return f"Ошибка при обработке: {str(e)}"


def ensure_utf8(text: str) -> str:
    """Нормализует UTF-8 (заменяет невалидные символы; параметры: text; возвращает: str)."""
    if isinstance(text, str):
        return text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
    return text
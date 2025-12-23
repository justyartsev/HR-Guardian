from openai import OpenAI

# Подключение к Ollama (локальный LLM на localhost:11434)
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
MODEL = "gemma2:2b"

# Системное сообщение для HR ассистента
SYSTEM_MESSAGE = """Вы — ассистент HR отдела. Помогаете сотрудникам с вопросами о:
- Политиках компании
- Процедурах и регламентах
- Льготах и компенсациях  
- Правах сотрудников

ВАЖНО:
1. Используйте ТОЛЬКО переданные документы. Не генерируйте информацию.
2. Если ответ требует персональных данных пользователя (ФИ, должность, зарплата) - используйте их если они переданы, но будьте осторожны.
3. Если документов недостаточно - скажите "К сожалению, в базе нет информации о вашем вопросе. Пожалуйста, обратитесь к HR."
4. Будьте конкретны и краткие. Максимум 2-3 абзаца.
5. Если требуется помощь вне вашей компетенции - предложите обратиться к HR специалисту."""


def answer(prompt: str, chunks: list = None, sources: list = None) -> str:
    """Генерирует ответ LLM с контекстом документов (параметры: prompt, chunks, sources; возвращает: str ответ).
    
    Prompt должен содержать:
    1. История диалога (если есть)
    2. Персональные данные (если переданы)  
    3. Релевантные чанки документов
    4. Сам вопрос
    """
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
                max_tokens=500,  # Увеличили до 500 для полноценных ответов
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
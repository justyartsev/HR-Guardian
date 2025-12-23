"""
Единый файл для определения всех Enum в приложении.
Избегает дублирования и циклических импортов.
"""
from enum import Enum


class UserRole(str, Enum):
    """Роли пользователя в системе."""
    employee = "employee"  # Обычный сотрудник
    hr = "hr"              # HR-специалист
    admin = "admin"        # Администратор


class DocumentFormat(str, Enum):
    """Поддерживаемые форматы документов."""
    pdf = "pdf"      # PDF документ
    docx = "docx"    # Word документ
    md = "md"        # Markdown
    txt = "txt"      # Текстовый файл
    html = "html"    # HTML страница
    wiki = "wiki"    # Wiki страница
    faq = "faq"      # FAQ раздел


class SyncStatus(str, Enum):
    """Статусы синхронизации документов с RAG."""
    PENDING = "pending"      # Ожидание активации (до effective_from)
    SYNCING = "syncing"      # Отправляется в RAG на обработку
    SYNCED = "synced"        # Успешно обработан RAG, готов к поиску
    ARCHIVED = "archived"    # Архивирован (заменен новой версией)
    ERROR = "error"          # Ошибка при обработке RAG


class MessageRole(str, Enum):
    """Роли в диалоге (кто отправил сообщение)."""
    user = "user"      # Пользователь
    bot = "bot"        # Чат-бот (ассистент)

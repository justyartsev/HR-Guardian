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


class UserStatus(str, Enum):
    """Статус учётной записи пользователя."""
    pending = "pending"    # Ожидает подтверждения админом
    approved = "approved"  # Подтверждён, может входить
    rejected = "rejected"  # Отклонён админом


class AccessLevel(str, Enum):
    """Уровни доступа к документам."""
    all = "all"          # Доступен всем сотрудникам
    hr_only = "hr_only"  # Только для HR (и admin)


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
    PENDING = "pending"      # Ожидает синхронизации с RAG
    SYNCED = "synced"        # Успешно синхронизирован, доступен для поиска
    ARCHIVED = "archived"    # Архивирован (заменен новой версией)
    ERROR = "error"          # Ошибка при синхронизации


class MessageRole(str, Enum):
    """Роли в диалоге (кто отправил сообщение)."""
    user = "user"           # Пользователь
    assistant = "assistant" # Ассистент (чат-бот)

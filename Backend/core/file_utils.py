"""
Утилиты для работы с файлами в Backend
"""


def sanitize_filename(filename: str) -> str:
    """
    Очистить имя файла от опасных символов
    Оставляет только буквы, цифры, пробелы, точки, дефисы и подчеркивания
    
    Args:
        filename: Исходное имя файла
        
    Returns:
        Очищенное имя файла без опасных символов
    """
    if not filename:
        return "document"
    
    # Оставляем только безопасные символы
    safe_chars = (c for c in filename if c.isalnum() or c in (' ', '.', '_', '-'))
    result = ''.join(safe_chars).strip()
    
    # Если в результате ничего не осталось, используем дефолтное имя
    return result if result else "document"

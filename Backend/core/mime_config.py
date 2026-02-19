"""
Централизованный конфиг MIME-типов и расширений файлов
Единственный источник истины для маппинга форматов
"""

# Маппинг MIME-type → расширение файла
MIME_TO_EXTENSION = {
    'application/pdf': '.pdf',
    'application/msword': '.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/markdown': '.md',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/zip': '.zip',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
}

# Маппинг формата документа → расширение файла
FORMAT_TO_EXTENSION = {
    'pdf': '.pdf',
    'docx': '.docx',
    'doc': '.doc',
    'xlsx': '.xlsx',
    'xls': '.xls',
    'md': '.md',
    'markdown': '.md',
    'txt': '.txt',
    'text': '.txt',
    'html': '.html',
    'csv': '.csv',
    'json': '.json',
    'zip': '.zip',
    'jpg': '.jpg',
    'jpeg': '.jpg',
    'png': '.png',
    'gif': '.gif',
    'webp': '.webp',
}

# Маппинг формата документа → MIME-type (обратный маппинг)
FORMAT_TO_MIME = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'csv': 'text/csv',
    'json': 'application/json',
    'zip': 'application/zip',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
}


def get_extension_by_mime(mime_type: str) -> str:
    """Получить расширение файла по MIME-type"""
    return MIME_TO_EXTENSION.get(mime_type, '')


def get_extension_by_format(format_str: str) -> str:
    """Получить расширение файла по формату документа"""
    if not format_str:
        return ''
    # Нормализуем формат (убираем точку если есть, приводим в нижний регистр)
    normalized = format_str.lower().lstrip('.')
    return FORMAT_TO_EXTENSION.get(normalized, '')


def get_mime_by_format(format_str: str) -> str:
    """Получить MIME-type по формату документа"""
    if not format_str:
        return 'application/octet-stream'
    # Нормализуем формат
    normalized = format_str.lower().lstrip('.')
    return FORMAT_TO_MIME.get(normalized, 'application/octet-stream')


def get_extension(mime_type: str = None, format_str: str = None, filename: str = None) -> str:
    """
    Получить расширение файла с приоритетом:
    1. MIME-type
    2. Формат документа
    3. Имя файла
    4. Пусто
    """
    # Приоритет 1: MIME-type
    if mime_type:
        ext = get_extension_by_mime(mime_type)
        if ext:
            return ext

    # Приоритет 2: Формат документа
    if format_str:
        ext = get_extension_by_format(format_str)
        if ext:
            return ext

    # Приоритет 3: Извлечение из имени файла
    if filename:
        parts = filename.split('.')
        if len(parts) > 1:
            ext_candidate = '.' + parts[-1].lower()
            # Проверяем, есть ли этот формат в нашем маппинге
            normalized = ext_candidate.lstrip('.')
            if normalized in FORMAT_TO_EXTENSION:
                return ext_candidate

    # Fallback
    return ''

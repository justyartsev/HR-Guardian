/**
 * Utility функция для унифицированного скачивания файлов
 * Используется везде: в чате, в Knowledge Base, в модальных окнах
 * 
 * Маппинги синхронизированы с Backend/core/mime_config.py
 */

// Маппинг MIME-type на расширения файлов (синхронизирован с Backend)
const MIME_TO_EXTENSION = {
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
};

// Расширения файлов по формату (синхронизирован с Backend)
const FORMAT_TO_EXTENSION = {
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
};

/**
 * Получить расширение файла из MIME-type или fallback
 * @param {string} contentType - MIME-type из заголовка
 * @param {string} format - Формат документа (fallback)
 * @param {string} filename - Имя файла (последний fallback)
 * @returns {string} Расширение файла с точкой (например .pdf)
 */
export const getFileExtension = (contentType, format = null, filename = null) => {
  // Приоритет 1: MIME-type из заголовка
  if (contentType && MIME_TO_EXTENSION[contentType]) {
    return MIME_TO_EXTENSION[contentType];
  }

  // Приоритет 2: Формат документа
  if (format) {
    const normalizedFormat = format.toLowerCase().replace(/^\./, ''); // убираем точку если есть
    if (FORMAT_TO_EXTENSION[normalizedFormat]) {
      return FORMAT_TO_EXTENSION[normalizedFormat];
    }
  }

  // Приоритет 3: Извлечение из имени файла
  if (filename) {
    const parts = filename.split('.');
    if (parts.length > 1) {
      const ext = '.' + parts[parts.length - 1].toLowerCase();
      if (FORMAT_TO_EXTENSION[ext.replace(/^\./, '')]) {
        return ext;
      }
    }
  }

  // Fallback
  return '';
};

/**
 * Загрузить файл с правильным расширением
 * @param {Blob} blob - Данные файла
 * @param {string} baseFilename - Имя файла без расширения
 * @param {string} contentType - MIME-type из заголовка ответа
 * @param {string} format - Формат документа (fallback)
 */
export const downloadFile = (blob, baseFilename, contentType = null, format = null) => {
  try {
    // Получаем правильное расширение
    const extension = getFileExtension(contentType, format, baseFilename);
    
    // Формируем финальное имя файла
    const finalFilename = extension && !baseFilename.endsWith(extension)
      ? baseFilename + extension
      : baseFilename;

    // Создаём и инициируем скачивание
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = downloadUrl;
    a.download = finalFilename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Скачать документ через API с унифицированной логикой
 * @param {string} documentId - ID документа
 * @param {string|null} versionId - ID версии (опционально)
 * @param {string} title - Название документа для имени файла
 * @param {string} format - Формат документа
 * @param {string} baseUrl - Base URL для API (опционально, по умолчанию /api)
 */
export const downloadDocumentFromAPI = async (documentId, title = 'document', format = null, versionId = null, baseUrl = '/api') => {
  try {
    const token = localStorage.getItem('access_token');
    const url = versionId
      ? `${baseUrl}/documents/${documentId}/download?version_id=${versionId}`
      : `${baseUrl}/documents/${documentId}/download`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Получаем MIME-type из заголовка ответа
    const contentType = response.headers.get('content-type');
    
    // Пытаемся получить имя из content-disposition
    let filenameFromHeader = null;
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=([^;]+)/i);
      if (match && match[1]) {
        filenameFromHeader = match[1].replace(/['"]/g, '').trim();
      }
    }

    // Используем имя из заголовка если есть, иначе переданное название
    const baseFilename = filenameFromHeader || title;

    // Получаем blob и скачиваем
    const blob = await response.blob();
    downloadFile(blob, baseFilename, contentType, format);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

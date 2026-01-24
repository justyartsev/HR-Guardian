// src/services/documentService.js
import api from './api';

// Функция для преобразования MIME-type или имени файла в расширение
const getFileFormat = (file) => {
  const mimeTypeMap = {
    'application/pdf': 'pdf',
    'application/msword': 'docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/markdown': 'md',
    'text/plain': 'txt',
    'text/html': 'html',
  };

  // Пытаемся определить формат по MIME-type
  if (file.type && mimeTypeMap[file.type]) {
    return mimeTypeMap[file.type];
  }

  // Если не найден в map, пытаемся получить расширение из имени файла
  const fileName = file.name || '';
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Проверяем, является ли расширение валидным
  const validFormats = ['pdf', 'docx', 'md', 'txt', 'html'];
  if (extension && validFormats.includes(extension)) {
    return extension;
  }

  // Если ничего не подошло, возвращаем 'txt' по умолчанию
  return 'txt';
};

export const documentService = {
  // Получить все документы
  async getDocuments() {
    try {
      const response = await api.get('/documents/');
      return response.data || [];
    } catch (error) {
      console.error('Error getting documents:', error);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // Получить ожидающие активации документы (с будущей датой)
  async getPendingDocuments() {
    try {
      const response = await api.get('/documents/pending');
      return response.data || [];
    } catch (error) {
      console.error('Error getting pending documents:', error);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // Получить документ по ID
  async getDocument(docId) {
    try {
      const response = await api.get(`/documents/${docId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  },

  // Создать новый документ
  async createDocument(documentData) {
    try {
      const response = await api.post('/documents/', documentData);
      return response.data;
      
    } catch (error) {
      console.error('Create document ERROR DETAILS:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        requestData: documentData,
        message: error.message,
        code: error.code
      });
      
      throw error;
    }
  },


  // Обновить документ
  async updateDocument(docId, documentData) {
    try {
      const response = await api.put(`/documents/${docId}`, documentData);
      return response.data;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  // Удалить документ
  async deleteDocument(docId) {
    try {
      const response = await api.delete(`/documents/${docId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Добавить версию документа
  async addDocumentVersion(docId, versionData) {
    try {
      const response = await api.post(`/documents/${docId}/versions`, versionData);
      return response.data;
    } catch (error) {
      console.error('Error adding document version:', error);
      throw error;
    }
  },

  // Загрузить документ (файл)
  async uploadDocument(file, effectiveDate, title = null, accessLevel = 'all') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Используем переданный title или имя файла без расширения
      formData.append('title', title || file.name.replace(/\.[^/.]+$/, ""));
      formData.append('format', getFileFormat(file)); // Отправляем расширение файла

      if (effectiveDate) {
        formData.append('effective_from', effectiveDate); // Отправляем как effective_from
      }

      // Уровень доступа: all (всем) или hr_only (только HR/admin)
      formData.append('access_level', accessLevel);

      // Отправляем на правильный endpoint (POST /)
      const response = await api.post('/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;

    } catch (error) {
      console.error('Upload document error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Отменить запланированное обновление документа (удалить pending версии)
  async cancelScheduledUpdate(docId) {
    try {
      const response = await api.post(`/documents/${docId}/cancel_update`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling scheduled update:', error);
      throw error;
    }
  },

  // Скачать документ
  async downloadDocument(docId) {
    try {
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  },

  // Восстановить версию документа
  async restoreVersion(docId, versionId) {
    try {
      const response = await api.post(`/documents/${docId}/versions/${versionId}/restore`);
      return response.data;
    } catch (error) {
      console.error('Error restoring document version:', error);
      throw error;
    }
  },
};
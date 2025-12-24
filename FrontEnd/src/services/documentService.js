// src/services/documentService.js
import api from './api';

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
      console.log('Creating document with data:', JSON.stringify(documentData, null, 2));
      
      const response = await api.post('/documents/', documentData);
      
      console.log('Create document SUCCESS:', {
        status: response.status,
        data: response.data
      });
      
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
};
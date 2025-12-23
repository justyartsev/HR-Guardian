// src/services/dialogService.js
import api from './api';

export const dialogService = {
  // Создать диалог
  async createDialog(title, userId) {
    try {
      const response = await api.post('/dialogs/', {
        title: title || `Новый чат ${new Date().toLocaleDateString()}`,
        user_id: userId,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating dialog:', error);
      throw error;
    }
  },

  // Получить диалоги пользователя
  async getUserDialogs(userId) {
    try {
      const response = await api.get(`/dialogs/user/${userId}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting dialogs:', error);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // Удалить диалог
  async deleteDialog(dialogId) {
    try {
      const response = await api.delete(`/dialogs/${dialogId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting dialog:', error);
      throw error;
    }
  },

  // Получить сообщения диалога
  async getMessages(dialogId) {
    try {
      const response = await api.get(`/dialogs/${dialogId}/messages`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  },

  // Отправить сообщение
  async sendMessage(dialogId, text, sender = 'user') {
    try {
      const response = await api.post(`/dialogs/${dialogId}/messages`, {
        text,
        sender: sender // 'user' или 'ai'
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Обновить заголовок диалога
  async updateDialogTitle(dialogId, title) {
    try {
      const response = await api.patch(`/dialogs/${dialogId}/title`, {
        title: title
      });
      return response.data;
    } catch (error) {
      console.error('Error updating dialog title:', error);
      throw error;
    }
  },
};
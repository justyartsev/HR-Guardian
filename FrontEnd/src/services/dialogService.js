import api from './api';

export const dialogService = {
  // Создать диалог
  async createDialog(title, userId) {
    try {
      console.log('Creating dialog for user:', userId);
      const response = await api.post('/dialogs/', {
        user_id: userId,
        title: title || `Новый чат ${new Date().toLocaleDateString()}`,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating dialog:', error);
      throw new Error(`Не удалось создать чат: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Получить диалоги пользователя
  async getUserDialogs(userId) {
    try {
      console.log('Getting dialogs for user:', userId);
      const response = await api.get(`/dialogs/user/${userId}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting dialogs:', error);
      // Если 404 - значит у пользователя нет диалогов
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(`Не удалось загрузить чаты: ${error.message}`);
    }
  },

  // Получить диалог по ID
  async getDialog(dialogId) {
    try {
      const response = await api.get(`/dialogs/${dialogId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting dialog:', error);
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
      throw new Error(`Не удалось удалить чат: ${error.response?.data?.detail || error.message}`);
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
      console.log('Sending message to dialog:', dialogId);
      const response = await api.post(`/dialogs/${dialogId}/messages`, {
        sender,
        text,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Не удалось отправить сообщение: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Обновить заголовок диалога (нужен эндпоинт в бэкенде)
  async updateDialogTitle(dialogId, title) {
    try {
      // TODO: Добавить когда будет эндпоинт PATCH /dialogs/{id}
      // const response = await api.patch(`/dialogs/${dialogId}`, { title });
      // return response.data;
      
      // Пока возвращаем заглушку
      return { id: dialogId, title };
    } catch (error) {
      console.error('Error updating dialog title:', error);
      throw error;
    }
  },
};
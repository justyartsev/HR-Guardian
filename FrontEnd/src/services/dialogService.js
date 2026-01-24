import api from './api';

export const dialogService = {
  // Создать диалог
  async createDialog(title) {
    try {
      // Backend автоматически устанавливает user_id текущему пользователю
      const response = await api.post('/dialogs/', {
        title: title || `Новый чат ${new Date().toLocaleDateString()}`,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating dialog:', error);
      throw new Error(`Не удалось создать чат: ${error.response?.data?.detail || error.message}`);
    }
  },

  // Получить диалоги пользователя
  async getUserDialogs() {
    try {
      // Используем /user/me чтобы получить диалоги текущего пользователя (аутентифицированного)
      const response = await api.get(`/dialogs/user/me`);
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

  // Отправить сообщение (с опциональными источниками для ответов бота)
  async sendMessage(dialogId, text, role = 'user', sources = null) {
    try {
      const messageData = {
        role: role,
        content: text,
      };

      // Добавляем источники если они есть (для assistant сообщений)
      if (sources && Array.isArray(sources) && sources.length > 0) {
        // Преобразуем sources в формат, ожидаемый бэкендом
        messageData.sources = sources.map(s => ({
          document_id: s.document_id,
          version_id: s.version_id || 0,
          chunk_index: s.chunk_index || 0,
          title: s.title || null
        }));
      }

      console.log('[DIALOG] Sending message:', {
        dialogId,
        messageData: JSON.stringify(messageData, null, 2)
      });

      const response = await api.post(`/dialogs/${dialogId}/messages`, messageData);
      return response.data;
    } catch (error) {
      console.error('[DIALOG] ERROR sending message:', error);
      console.error('   Request data:', { dialogId, role, textLength: text?.length, sources });
      console.error('   Response status:', error.response?.status);
      console.error('   Response data:', JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  },

  // Обновить сообщение (для редактирования)
  async updateMessage(messageId, content) {
    try {
      const response = await api.patch(`/dialogs/messages/${messageId}`, {
        content: content
      });
      return response.data;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  },

  // Обновить заголовок диалога
  async updateDialogTitle(dialogId, title) {
    try {
      // Backend ожидает PATCH с body содержащим title
      const response = await api.patch(`/dialogs/${dialogId}`, {
        title: title
      });
      return response.data;
    } catch (error) {
      console.error('Error updating dialog title:', error);
      throw error;
    }
  },

  // Обновить диалог (общий метод)
  async updateDialog(dialogId, data) {
    try {
      // Backend ожидает PATCH с body содержащим title
      const response = await api.patch(`/dialogs/${dialogId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating dialog:', error);
      throw new Error(`Не удалось обновить чат: ${error.response?.data?.detail || error.message}`);
    }
  },
};

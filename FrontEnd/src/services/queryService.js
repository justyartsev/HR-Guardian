import api from './api';

export const queryService = {
  // Отправить запрос к нейронной сети
  async processQuery(dialogId, query) {
    try {
      console.log('Sending query to AI:', query);
      const response = await api.post('/query/', {
        dialog_id: dialogId,
        query: query,
      });
      return response.data;
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  },

  // Получить контекст диалога
  async getDialogContext(dialogId) {
    try {
      const response = await api.get(`/query/${dialogId}/context`);
      return response.data;
    } catch (error) {
      console.error('Error getting dialog context:', error);
      throw error;
    }
  },
};
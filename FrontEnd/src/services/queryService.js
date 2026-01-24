import api from './api';
import { streamService } from './streamService';

export const queryService = {
  // Отправить запрос к нейронной сети через SSE
  async processQuery(dialogId, query, onChunk, onComplete, onError, personalData = {}, chatMessages = []) {
    try {
      await streamService.sendQueryStream(dialogId, query, onChunk, onComplete, onError, personalData, chatMessages);
    } catch (error) {
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
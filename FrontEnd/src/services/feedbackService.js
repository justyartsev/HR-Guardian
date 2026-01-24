import api from './api';

export const feedbackService = {
  // Отправить жалобу на ответ LLM
  async submitReport(messageId, reportData) {
    try {
      const response = await api.post('/feedback/', {
        message_id: messageId,
        dialog_id: reportData.dialog_id,
        rating: reportData.rating || null,
        comment: reportData.comment || '',
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting report:', error);
      throw new Error(
        `Не удалось отправить жалобу: ${error.response?.data?.detail || error.message}`
      );
    }
  },

  // Отправить жалобу на ответ LLM (альтернативный метод)
  async reportFeedback(messageId, dialogId, rating, comment) {
    try {
      const response = await api.post('/feedback/', {
        message_id: messageId,
        dialog_id: dialogId,
        rating: rating, // 1-5 звёзд
        comment: comment || '',
      });
      return response.data;
    } catch (error) {
      console.error('Error reporting feedback:', error);
      throw new Error(
        `Не удалось отправить жалобу: ${error.response?.data?.detail || error.message}`
      );
    }
  },

  // Получить все жалобы (для HR)
  async getAllFeedback(limit = 100, skip = 0) {
    try {
      const response = await api.get('/feedback/', {
        params: { limit, skip },
      });
      return response.data || [];
    } catch (error) {
      console.error('Error getting feedback:', error);
      throw error;
    }
  },

  // Получить жалобы по диалогу
  async getDialogFeedback(dialogId) {
    try {
      const response = await api.get(`/dialogs/${dialogId}/feedback`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting dialog feedback:', error);
      throw error;
    }
  },

  // Обновить статус жалобы (для HR)
  async updateFeedbackStatus(feedbackId, status) {
    try {
      const response = await api.patch(`/feedback/${feedbackId}`, {
        status: status, // 'new', 'acknowledged', 'resolved'
      });
      return response.data;
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  },

  // Удалить жалобу (для HR с правами)
  async deleteFeedback(feedbackId) {
    try {
      const response = await api.delete(`/feedback/${feedbackId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  },

  // Получить количество новых жалоб (для уведомлений)
  async getNewFeedbackCount() {
    try {
      const feedback = await this.getAllFeedback(100);
      return feedback.filter(f => f.status === 'new').length;
    } catch (error) {
      return 0;
    }
  },
};

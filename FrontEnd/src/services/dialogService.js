import api from './api';
import { DIALOGS_URL } from '../config/api';

export const dialogService = {
  // Создать новый диалог
  async createDialog(title, userId) {
    const response = await api.post(`${DIALOGS_URL}/`, {
      user_id: userId,
      title: title || `Чат ${new Date().toLocaleDateString()}`,
    });
    return response.data;
  },

  // Получить диалоги пользователя
  async getUserDialogs(userId) {
    const response = await api.get(`${DIALOGS_URL}/user/${userId}`);
    return response.data;
  },

  // Получить диалог по ID
  async getDialog(dialogId) {
    const response = await api.get(`${DIALOGS_URL}/${dialogId}`);
    return response.data;
  },

  // Удалить диалог
  async deleteDialog(dialogId) {
    const response = await api.delete(`${DIALOGS_URL}/${dialogId}`);
    return response.data;
  },

  // Получить сообщения диалога
  async getMessages(dialogId) {
    const response = await api.get(`${DIALOGS_URL}/${dialogId}/messages`);
    return response.data;
  },

  // Отправить сообщение
  async sendMessage(dialogId, message, sender = 'user') {
    const response = await api.post(`${DIALOGS_URL}/${dialogId}/messages`, {
      sender,
      text: message,
    });
    return response.data;
  },

  // Обновить заголовок диалога
  async updateDialogTitle(dialogId, newTitle) {
    // Нужно добавить эндпоинт в бэкенде для обновления
    // Пока используем локальное обновление
    return { id: dialogId, title: newTitle };
  },
};
import api from './api';

export const userService = {
  // Получить всех пользователей
  getAllUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },

  // Получить пользователей ожидающих подтверждения
  getPendingUsers: async () => {
    const response = await api.get('/auth/users/pending');
    return response.data;
  },

  // Подтвердить или отклонить пользователя
  approveUser: async (userId, status, role = null) => {
    const data = { status };
    if (role) {
      data.role = role;
    }
    const response = await api.patch(`/auth/users/${userId}/approve`, data);
    return response.data;
  },

  // Изменить роль пользователя
  changeUserRole: async (userId, role) => {
    const response = await api.patch(`/auth/users/${userId}/role`, null, {
      params: { role }
    });
    return response.data;
  },

  // Получить количество ожидающих пользователей (для уведомлений)
  getPendingCount: async () => {
    try {
      const pending = await userService.getPendingUsers();
      return pending.length;
    } catch {
      return 0;
    }
  }
};

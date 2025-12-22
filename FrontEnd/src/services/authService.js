import api from './api';
import { AUTH_URL } from '../config/api';

export const authService = {
  // Регистрация
  async register(userData) {
    const response = await api.post(`${AUTH_URL}/register`, {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: 'employee', // По умолчанию employee, как в бэкенде
    });
    return response.data;
  },

  // Вход
  async login(email, password) {
    const response = await api.post(`${AUTH_URL}/login`, {
      email,
      password,
    });
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      // Получаем информацию о пользователе (нужно будет добавить эндпоинт в бэкенде)
      const userData = await this.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    return response.data;
  },

  // Выход
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('hrg_chats'); // Очищаем локальные чаты
  },

  // Получение текущего пользователя
  async getCurrentUser() {
    try {
      // Пока возвращаем базовые данные из токена
      // Позже нужно добавить эндпоинт /auth/me в бэкенде
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      // Парсим JWT токен (только для получения userId)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      return {
        id: payload.sub,
        username: 'Пользователь', // Временное значение
        email: payload.email || '',
        role: 'employee',
      };
    } catch (error) {
      return null;
    }
  },

  // Проверка авторизации
  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },
};
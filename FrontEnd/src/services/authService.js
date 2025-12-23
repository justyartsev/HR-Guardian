import api from './api';

export const authService = {
  async register(userData) {
    try {
      console.log('Registration attempt:', userData.email);
      
      const response = await api.post('/auth/register', {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,  // Добавляем имя и фамилию в запрос
        last_name: userData.lastName,
        role: 'employee',
      });
      
      console.log('Registration successful');
      
      // После регистрации автоматически логинимся
      const loginResult = await this.login(userData.email, userData.password);
      
      // Сохраняем полные данные пользователя
      const userInfo = {
        ...loginResult.user,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username
      };
      
      // Сохраняем в localStorage
      localStorage.setItem('user', JSON.stringify(userInfo));
      
      return {
        ...loginResult,
        user: userInfo
      };
      
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  async login(email, password) {
    try {
      console.log('Login attempt:', email);
      
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      console.log('Login response received');
      
      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }
      
      // Сохраняем токен
      localStorage.setItem('access_token', response.data.access_token);
      
      // Получаем данные пользователя
      const userInfo = await this.getUserInfo();
      
      if (!userInfo) {
        throw new Error('Could not get user information');
      }
      
      // Сохраняем пользователя
      localStorage.setItem('user', JSON.stringify(userInfo));
      
      return {
        ...response.data,
        user: userInfo
      };
      
    } catch (error) {
      console.error('Login failed:', error);
      // Очищаем на случай частичного успеха
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      throw error;
    }
  },

  // Новый метод: получение информации о пользователе с бэкенда
  async getUserInfo() {
    try {
      // Пока нет эндпоинта /auth/me, используем то что есть
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      // Декодируем JWT токен
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      const userId = parseInt(payload.sub);
      if (!userId) return null;
      
      // Пробуем получить из localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      return {
        id: userId,
        username: payload.username || storedUser.username || '',
        email: payload.email || storedUser.email || '',
        firstName: payload.first_name || storedUser.firstName || '',
        lastName: payload.last_name || storedUser.lastName || '',
        role: payload.role || storedUser.role || 'employee',
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  },

  // Получение текущего пользователя
  getCurrentUser() {
    try {
      // Пытаемся получить из localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
      
      // Если нет в localStorage, пытаемся декодировать из токена
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      return {
        id: parseInt(payload.sub),
        username: payload.username || '',
        email: payload.email || '',
        firstName: payload.first_name || '',
        lastName: payload.last_name || '',
        role: payload.role || 'employee',
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  logout() {
    // Очищаем все данные
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    // Не очищаем hrg_chats - они теперь в бэкенде
  },

  isAuthenticated() {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    // Проверяем, не истек ли токен
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      // Проверяем expiry
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  },
};
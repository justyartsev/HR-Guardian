// src/services/authService.js
import api from './api';

export const authService = {
  async register(userData) {
    try {
      console.log('Registration attempt:', userData.email);
      
      const response = await api.post('/auth/register', {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName || '',
        last_name: userData.lastName || '',
        role: 'employee',
      });
      
      console.log('Registration successful:', response.data);
      
      // После регистрации автоматически логинимся
      const loginResult = await this.login({
        email: userData.email,
        password: userData.password
      });
      
      return loginResult;
      
    } catch (error) {
      console.error('Registration failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  async login(credentials) {
    try {
      console.log('Login called with credentials:', credentials);
      
      // Правильно извлекаем email и password
      let email, password;
      
      if (typeof credentials === 'object' && credentials !== null) {
        // Если передан объект {email: "...", password: "..."}
        email = credentials.email;
        password = credentials.password;
      } else {
        // Если передан email как строка и password как второй аргумент (устаревший формат)
        email = credentials;
        password = arguments[1];
      }
      
      console.log('Extracted email:', email, 'password:', password ? '***' : 'undefined');
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const response = await api.post('/auth/login', {
        email: email,
        password: password,
      });
      
      console.log('Login response:', response.data);
      
      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }
      
      // Сохраняем токен
      localStorage.setItem('access_token', response.data.access_token);
      
      // Декодируем токен для получения данных пользователя
      const token = response.data.access_token;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      const userInfo = {
        id: parseInt(payload.sub),
        username: payload.username || '',
        email: payload.email || '',
        firstName: payload.first_name || '',
        lastName: payload.last_name || '',
        role: payload.role || 'employee',
      };
      
      console.log('Decoded user info:', userInfo);
      
      // Сохраняем пользователя
      localStorage.setItem('user', JSON.stringify(userInfo));
      
      return {
        ...response.data,
        user: userInfo
      };
      
    } catch (error) {
      console.error('Login failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Бросаем понятную ошибку для UI
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Ошибка входа. Проверьте email и пароль.');
      }
    }
  },

  async getUserInfo() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      
      // Декодируем JWT токен
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
      console.error('Error getting user info:', error);
      return null;
    }
  },

  getCurrentUser() {
    try {
      // Пытаемся получить из localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('Retrieved user from localStorage:', user);
        return user;
      }
      
      // Если нет в localStorage, пытаемся декодировать из токена
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('No token found');
        return null;
      }
      
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      const user = {
        id: parseInt(payload.sub),
        username: payload.username || '',
        email: payload.email || '',
        firstName: payload.first_name || '',
        lastName: payload.last_name || '',
        role: payload.role || 'employee',
      };
      
      console.log('Decoded user from token:', user);
      return user;
      
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  logout() {
    console.log('Logging out...');
    // Очищаем все данные
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    console.log('User logged out');
  },

  isAuthenticated() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('No token - not authenticated');
        return false;
      }
      
      // Проверяем, не истек ли токен
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      // Проверяем expiry
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.log('Token expired');
        this.logout();
        return false;
      }
      
      console.log('User is authenticated');
      return true;
      
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.logout();
      return false;
    }
  },
};
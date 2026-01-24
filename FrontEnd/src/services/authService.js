import api from './api';

// Декодирование JWT токена
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Извлечение данных пользователя из JWT payload
const extractUserInfo = (payload) => {
  if (!payload || !payload.sub) return null;
  return {
    id: parseInt(payload.sub),
    username: payload.username || '',
    email: payload.email || '',
    firstName: payload.first_name || '',
    lastName: payload.last_name || '',
    role: payload.role || 'employee',
    position: payload.position || '',
    department: payload.department || '',
    status: payload.status || 'pending',
  };
};

export const authService = {
  async register(userData) {
    try {
      const response = await api.post('/auth/register', {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName || '',
        last_name: userData.lastName || '',
        position: userData.position || null,
        department: userData.department || null,
        role: 'employee', // По умолчанию все новые пользователи - сотрудники
      });

      // НЕ делаем автологин - пользователь должен быть одобрен HR/админом
      return {
        success: true,
        message: 'Регистрация успешна! Ожидайте одобрения администратора.',
        user: response.data
      };

    } catch (error) {
      console.error('Registration failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  async login(emailOrCredentials, passwordArg, rememberMeArg) {
    try {
      // Поддерживаем оба формата вызова:
      // login({email, password, remember_me}) или login(email, password, rememberMe)
      let email, password, remember_me;

      if (typeof emailOrCredentials === 'object' && emailOrCredentials !== null) {
        email = emailOrCredentials.email;
        password = emailOrCredentials.password;
        remember_me = emailOrCredentials.remember_me || false;
      } else {
        email = emailOrCredentials;
        password = passwordArg;
        remember_me = rememberMeArg || false;
      }

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const response = await api.post('/auth/login', {
        email: email,
        password: password,
        remember_me: remember_me,
      });

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }
      
      // Сохраняем токен
      localStorage.setItem('access_token', response.data.access_token);
      
      // Декодируем токен для получения данных пользователя
      const token = response.data.access_token;
      const payload = decodeJWT(token);
      const userInfo = extractUserInfo(payload);

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

      const payload = decodeJWT(token);
      return extractUserInfo(payload);
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
        return JSON.parse(userStr);
      }

      // Если нет в localStorage, пытаемся декодировать из токена
      const token = localStorage.getItem('access_token');
      if (!token) {
        return null;
      }

      const payload = decodeJWT(token);
      return extractUserInfo(payload);
      
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  logout() {
    localStorage.clear();
    sessionStorage.clear();
  },

  isAuthenticated() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return false;
      }

      // Проверяем, не истек ли токен
      const payload = decodeJWT(token);
      if (!payload) {
        this.logout();
        return false;
      }

      // Проверяем expiry
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        this.logout();
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error checking authentication:', error);
      this.logout();
      return false;
    }
  },

  async updateProfile({ firstName, lastName, position, department }) {
    try {
      const updateData = {};
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (position !== undefined) updateData.position = position;
      if (department !== undefined) updateData.department = department;

      const response = await api.patch('/users/me', updateData);

      // Обновляем локальное хранилище
      const currentUser = this.getCurrentUser();
      const updatedUser = {
        ...currentUser,
        firstName: response.data.first_name ?? currentUser.firstName,
        lastName: response.data.last_name ?? currentUser.lastName,
        position: response.data.position ?? currentUser.position,
        department: response.data.department ?? currentUser.department
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
};
// Конфигурация API
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000', // Прямо указываем URL
  API_PREFIX: '/api',
};

export const API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;
export const AUTH_URL = `${API_URL}/auth`;
export const DIALOGS_URL = `${API_URL}/dialogs`;

// Для разработки установим переменную окружения в .env файле
// REACT_APP_API_URL=http://localhost:8000
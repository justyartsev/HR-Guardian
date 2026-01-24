// Конфигурация API
// Используем /api - работает через vite proxy (dev) и nginx (production/docker)
export const API_CONFIG = {
  BASE_URL: '/api',
  API_PREFIX: '',
};

export const API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;
export const API_BASE_URL = API_CONFIG.BASE_URL;
export const RAG_URL = '/rag';  // RAG сервис через прокси
export const AUTH_URL = `${API_URL}/auth`;
export const DIALOGS_URL = `${API_URL}/dialogs`;
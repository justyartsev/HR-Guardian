import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Обработчик ошибок proxy для подавления ECONNRESET
const handleProxyError = (err, req, res) => {
  // Игнорируем ECONNRESET - это нормально при закрытии SSE/WebSocket
  if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return;
  }
  // Игнорируем ошибки для SSE endpoints
  if (req.url && req.url.includes('/notifications/sse')) {
    return;
  }
  console.error('[Proxy Error]', err.message);
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Backend на порту 8000
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // Убираем /api при проксировании
        configure: (proxy) => {
          proxy.on('error', handleProxyError);
        }
      },
      '/rag': {
        target: 'http://127.0.0.1:9000', // RAG сервер на порту 9000
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', handleProxyError);
        }
      },
      '/ws/rag': {
        target: 'http://127.0.0.1:9000', // RAG сервер на порту 9000 (по умолчанию)
        changeOrigin: true,
        secure: false,
        ws: true, // Включаем WebSocket поддержку
        rewrite: (path) => path.replace(/^\/ws\/rag/, '/rag'), // Переписываем путь
        configure: (proxy) => {
          proxy.on('error', handleProxyError);
        }
      },
      '/ws/notifications': {
        target: 'http://127.0.0.1:8000', // Backend на порту 8000
        changeOrigin: true,
        secure: false,
        ws: true, // WebSocket для уведомлений HR
        configure: (proxy) => {
          proxy.on('error', handleProxyError);
        }
      }
    }
  }
})
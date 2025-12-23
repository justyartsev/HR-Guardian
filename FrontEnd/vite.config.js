import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    API_URL: JSON.stringify(process.env.API_URL) || JSON.stringify("127.0.0.1:8080")
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '') // Убираем /api из пути
      }
    }
  }
})

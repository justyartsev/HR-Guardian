import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './main.css'
import  App  from "./App.jsx";
import { UserProvider } from './contexts/UserContext';

// Настройка React Query для кэширования
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Данные считаются свежими 30 секунд
      gcTime: 5 * 60 * 1000, // Кэш хранится 5 минут
      retry: 1, // Одна попытка повтора при ошибке
      refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <App />
      </UserProvider>
    </QueryClientProvider>
  </StrictMode>,
)

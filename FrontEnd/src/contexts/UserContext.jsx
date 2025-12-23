import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

// Создаем контекст
const UserContext = createContext();

// Кастомный хук для использования контекста
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Провайдер контекста
export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    // Загружаем из localStorage при инициализации
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  });

  const [chats, setChats] = useState(() => {
    try {
      const storedChats = localStorage.getItem('hrg_chats');
      return storedChats ? JSON.parse(storedChats) : [];
    } catch (error) {
      console.error('Error parsing chats from localStorage:', error);
      return [];
    }
  });

  // Функция для обновления пользователя
  const updateUser = (userData) => {
    const fullUserData = {
      ...currentUser,
      ...userData
    };
    setCurrentUser(fullUserData);
    localStorage.setItem('user', JSON.stringify(fullUserData));
  };

  // Функция для обновления чатов
  const updateChats = (newChats) => {
    setChats(newChats);
    localStorage.setItem('hrg_chats', JSON.stringify(newChats));
  };

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated() && !currentUser) {
        try {
          const user = await authService.getCurrentUser();
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('user', JSON.stringify(user));
          }
        } catch (error) {
          console.error('Error loading user on init:', error);
        }
      }
    };
    
    checkAuth();
  }, [currentUser]);

  const value = {
    currentUser,
    chats,
    updateUser,
    updateChats,
    setChats
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Экспортируем контекст для прямого доступа (если нужно)
export default UserContext;
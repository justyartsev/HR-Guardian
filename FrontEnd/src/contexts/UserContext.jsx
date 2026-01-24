import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { feedbackService } from '../services/feedbackService';
import { useNotificationSSE } from '../hooks/useNotificationSSE';

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
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });

  const [chats, setChats] = useState(() => {
    try {
      const storedChats = localStorage.getItem('hrg_chats');
      return storedChats ? JSON.parse(storedChats) : [];
    } catch (error) {
      return [];
    }
  });

  // Счётчики уведомлений (для HR/admin)
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);

  // Флаг для отслеживания инициализации
  const isInitialized = useRef(false);
  const countsLoaded = useRef(false);

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

  // Функция загрузки счётчиков уведомлений
  const loadNotificationCounts = useCallback(async () => {
    const user = currentUser || authService.getCurrentUser();
    if (user && (user.role === 'hr' || user.role === 'admin')) {
      try {
        const [pendingCount, feedbackCount] = await Promise.all([
          userService.getPendingCount(),
          feedbackService.getNewFeedbackCount()
        ]);
        setPendingUsersCount(pendingCount);
        setNewFeedbackCount(feedbackCount);
      } catch (err) {
        // Ignore
      }
    }
  }, [currentUser]);

  // Функция для принудительного обновления счётчиков
  const refreshCounts = useCallback(() => {
    loadNotificationCounts();
  }, [loadNotificationCounts]);

  // SSE подключение для real-time уведомлений HR/Admin
  const { isConnected } = useNotificationSSE({
    onNewFeedback: () => {
      setNewFeedbackCount(prev => prev + 1);
    },
    onNewRegistration: () => {
      setPendingUsersCount(prev => prev + 1);
    },
    onCountsUpdate: (data) => {
      if (data.pending_users !== undefined) {
        setPendingUsersCount(data.pending_users);
      }
      if (data.new_feedbacks !== undefined) {
        setNewFeedbackCount(data.new_feedbacks);
      }
    },
    onDocumentActivated: (data) => {
      console.log('[Document Activated]', data);
    },
    enabled: currentUser && (currentUser.role === 'hr' || currentUser.role === 'admin')
  });

  // Функция для очистки данных пользователя (при logout)
  const clearUserData = () => {
    setCurrentUser(null);
    setChats([]);
    setPendingUsersCount(0);
    setNewFeedbackCount(0);
    localStorage.removeItem('user');
    localStorage.removeItem('hrg_chats');
    isInitialized.current = false;
    countsLoaded.current = false;
  };

  // Проверяем авторизацию при загрузке только один раз
  useEffect(() => {
    if (isInitialized.current) return;

    const checkAuth = () => {
      if (authService.isAuthenticated() && !currentUser) {
        try {
          const user = authService.getCurrentUser();
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('user', JSON.stringify(user));
          }
        } catch (error) {
          // Ignore
        }
      }
    };

    checkAuth();
    isInitialized.current = true;
    // Сбрасываем флаг при каждой перезагрузке страницы
    countsLoaded.current = false;
  }, []);

  // Загружаем счётчики один раз при изменении пользователя
  useEffect(() => {
    if (currentUser && (currentUser.role === 'hr' || currentUser.role === 'admin') && !countsLoaded.current) {
      countsLoaded.current = true;
      loadNotificationCounts();
    }
  }, [currentUser, loadNotificationCounts]);

  const value = {
    currentUser,
    chats,
    updateUser,
    updateChats,
    setChats,
    clearUserData,
    pendingUsersCount,
    newFeedbackCount,
    refreshCounts
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Экспортируем контекст для прямого доступа (если нужно)
export default UserContext;
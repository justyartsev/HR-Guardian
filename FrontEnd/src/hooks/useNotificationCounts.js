import { useUser } from '../contexts/UserContext';

/**
 * Хук для получения счётчиков уведомлений из контекста
 * Данные загружаются один раз в UserContext
 */
export function useNotificationCounts() {
  const { pendingUsersCount, newFeedbackCount, refreshCounts } = useUser();

  return {
    pendingUsersCount,
    newFeedbackCount,
    isLoading: false,
    refreshCounts
  };
}

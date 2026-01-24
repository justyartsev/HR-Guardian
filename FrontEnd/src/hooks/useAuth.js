import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * Универсальный хук авторизации.
 * Используется во всех Container компонентах вместо дублирования логики.
 */
export function useAuth({ requiredRoles = null, redirectTo = '/login' } = {}) {
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    const user = authService.getCurrentUser();

    // Если нет пользователя или не авторизован
    if (!user || !authService.isAuthenticated()) {
      return null;
    }

    // Если требуются определённые роли
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return null;
    }

    return user;
  }, [requiredRoles]);

  const isAuthenticated = !!currentUser;
  const isHR = currentUser?.role === 'hr' || currentUser?.role === 'admin';

  const logout = () => {
    authService.logout();
    navigate(redirectTo, { replace: true });
  };

  return {
    currentUser,
    isAuthenticated,
    isHR,
    logout,
    navigate
  };
}

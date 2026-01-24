import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { userService } from '../services/userService';

const USERS_KEY = ['users'];
const PENDING_USERS_KEY = ['users', 'pending'];

/**
 * Хук для управления пользователями с кэшированием через React Query.
 */
export function useUsers() {
  const queryClient = useQueryClient();

  // Все пользователи
  const {
    data: allUsers = [],
    isLoading: isLoadingAll,
    error: allError
  } = useQuery({
    queryKey: USERS_KEY,
    queryFn: () => userService.getAllUsers(),
    staleTime: 2 * 60 * 1000, // 2 минуты (данные редко меняются)
    refetchOnMount: false, // Не перезагружать если данные свежие
  });

  // Ожидающие подтверждения
  const {
    data: pendingUsers = [],
    isLoading: isLoadingPending,
    error: pendingError,
    refetch: refetchPending
  } = useQuery({
    queryKey: PENDING_USERS_KEY,
    queryFn: () => userService.getPendingUsers(),
    staleTime: 2 * 60 * 1000, // 2 минуты
    refetchOnMount: false, // Не перезагружать если данные свежие
  });

  // Подтверждение пользователя
  const approveMutation = useMutation({
    mutationFn: async ({ userId, status, role }) => {
      await userService.approveUser(userId, status, role);
      return { userId, status, role };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      queryClient.invalidateQueries({ queryKey: PENDING_USERS_KEY });
    },
  });

  // Изменение роли
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await userService.changeUserRole(userId, newRole);
      return { userId, newRole };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });

  const approveUser = useCallback(
    (userId, status, role = null) => approveMutation.mutateAsync({ userId, status, role }),
    [approveMutation]
  );

  const rejectUser = useCallback(
    (userId) => approveMutation.mutateAsync({ userId, status: 'rejected' }),
    [approveMutation]
  );

  const changeRole = useCallback(
    (userId, newRole) => changeRoleMutation.mutateAsync({ userId, newRole }),
    [changeRoleMutation]
  );

  const refreshUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: USERS_KEY });
    queryClient.invalidateQueries({ queryKey: PENDING_USERS_KEY });
  }, [queryClient]);

  return {
    allUsers,
    pendingUsers,
    isLoading: isLoadingAll || isLoadingPending,
    error: allError?.message || pendingError?.message || null,
    approveUser,
    rejectUser,
    changeRole,
    refreshUsers,
    isApproving: approveMutation.isPending,
    isChangingRole: changeRoleMutation.isPending,
  };
}

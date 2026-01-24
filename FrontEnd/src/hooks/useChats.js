import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { dialogService } from '../services/dialogService';

// Ключ кэша для чатов
const CHATS_QUERY_KEY = ['chats'];

/**
 * Получить следующий номер чата
 */
const getNextChatNumber = (existingChats) => {
  if (!existingChats || existingChats.length === 0) return 1;

  const chatNumbers = existingChats
    .map(chat => {
      const name = chat.title || chat.name || '';
      const match = name.match(/^Чат (\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);

  return chatNumbers.length > 0 ? Math.max(...chatNumbers) + 1 : existingChats.length + 1;
};

/**
 * Хук для управления чатами пользователя с кэшированием через React Query.
 * Данные кэшируются и не перезагружаются при навигации между страницами.
 */
export function useChats() {
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState(null);

  // Загрузка чатов с кэшированием
  const { data: chats = [], isLoading, error, refetch } = useQuery({
    queryKey: CHATS_QUERY_KEY,
    queryFn: async () => {
      const userDialogs = await dialogService.getUserDialogs();

      const formattedChats = (userDialogs || []).map(dialog => ({
        id: dialog.id,
        title: dialog.title,
        name: dialog.title,
        messages: [],
        created_at: dialog.created_at
      }));

      // Сортируем по дате создания (новые сверху)
      formattedChats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return formattedChats;
    },
    staleTime: 2 * 60 * 1000, // 2 минуты
    refetchOnMount: false, // Не перезагружать если данные свежие
  });

  // Создание чата
  const createChatMutation = useMutation({
    mutationFn: async () => {
      const nextNumber = getNextChatNumber(chats);
      const chatName = `Чат ${nextNumber}`;
      const newDialog = await dialogService.createDialog(chatName);
      return {
        id: newDialog.id,
        title: chatName,
        name: chatName,
        messages: [],
        created_at: newDialog.created_at || new Date().toISOString()
      };
    },
    onSuccess: (newChat) => {
      // Оптимистичное обновление кэша
      queryClient.setQueryData(CHATS_QUERY_KEY, (old = []) => [newChat, ...old]);
      setActiveChatId(newChat.id);
    },
  });

  // Переименование чата
  const renameChatMutation = useMutation({
    mutationFn: async ({ chatId, newName }) => {
      await dialogService.updateDialog(chatId, { title: newName });
      return { chatId, newName };
    },
    onSuccess: ({ chatId, newName }) => {
      queryClient.setQueryData(CHATS_QUERY_KEY, (old = []) =>
        old.map(chat =>
          chat.id === chatId ? { ...chat, name: newName, title: newName } : chat
        )
      );
    },
  });

  // Удаление чата
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId) => {
      await dialogService.deleteDialog(chatId);
      return chatId;
    },
    onSuccess: (deletedChatId) => {
      queryClient.setQueryData(CHATS_QUERY_KEY, (old = []) => {
        const remaining = old.filter(chat => chat.id !== deletedChatId);
        if (activeChatId === deletedChatId && remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        }
        return remaining;
      });
    },
  });

  // Обёртки для удобства использования
  const createChat = useCallback(async () => {
    const newChat = await createChatMutation.mutateAsync();
    return newChat.id; // Возвращаем только id
  }, [createChatMutation]);
  const renameChat = useCallback((chatId, newName) =>
    renameChatMutation.mutateAsync({ chatId, newName }), [renameChatMutation]);
  const deleteChat = useCallback((chatId) =>
    deleteChatMutation.mutateAsync(chatId), [deleteChatMutation]);

  // Ручное обновление списка
  const loadChats = useCallback(() => refetch(), [refetch]);

  // Установка чатов напрямую (для совместимости)
  const setChats = useCallback((newChats) => {
    queryClient.setQueryData(CHATS_QUERY_KEY, (oldChats = []) => {
      return typeof newChats === 'function' ? newChats(oldChats) : newChats;
    });
  }, [queryClient]);

  // Активный чат
  const activeChat = chats.find(chat => chat.id === activeChatId) || null;

  return {
    chats,
    setChats,
    activeChat,
    activeChatId,
    setActiveChatId,
    isLoading,
    error: error?.message || null,
    loadChats,
    createChat,
    renameChat,
    deleteChat,
    // Для отслеживания состояния мутаций
    isCreating: createChatMutation.isPending,
    isRenaming: renameChatMutation.isPending,
    isDeleting: deleteChatMutation.isPending,
  };
}

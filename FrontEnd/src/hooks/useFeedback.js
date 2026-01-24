import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { feedbackService } from '../services/feedbackService';

const FEEDBACK_KEY = ['feedback'];

/**
 * Хук для управления жалобами с кэшированием через React Query.
 */
export function useFeedback() {
  const queryClient = useQueryClient();

  const {
    data: complaints = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: FEEDBACK_KEY,
    queryFn: async () => {
      const feedback = await feedbackService.getAllFeedback(100);
      return feedback.map((fb, index) => ({
        id: fb.id,
        type: 'complaint',
        name: `#${fb.id}`,
        date: new Date(fb.created_at).toLocaleDateString('ru-RU'),
        dateTime: new Date(fb.created_at),
        user: fb.user_name || 'Неизвестный',
        rating: fb.rating,
        comment: fb.user_comment,
        question: fb.user_question,
        response: fb.bot_response,
        status: fb.status || 'new',
      }));
    },
    staleTime: 30 * 1000,
  });

  // Удаление жалобы
  const deleteMutation = useMutation({
    mutationFn: async (feedbackId) => {
      await feedbackService.deleteFeedback(feedbackId);
      return feedbackId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(FEEDBACK_KEY, (old = []) =>
        old.filter(item => item.id !== deletedId)
      );
    },
  });

  // Изменение статуса
  const statusMutation = useMutation({
    mutationFn: async ({ feedbackId, newStatus }) => {
      await feedbackService.updateFeedbackStatus(feedbackId, newStatus);
      return { feedbackId, newStatus };
    },
    onSuccess: ({ feedbackId, newStatus }) => {
      queryClient.setQueryData(FEEDBACK_KEY, (old = []) =>
        old.map(item =>
          item.id === feedbackId ? { ...item, status: newStatus } : item
        )
      );
    },
  });

  const deleteFeedback = useCallback(
    (feedbackId) => deleteMutation.mutateAsync(feedbackId),
    [deleteMutation]
  );

  const updateStatus = useCallback(
    (feedbackId, newStatus) => statusMutation.mutateAsync({ feedbackId, newStatus }),
    [statusMutation]
  );

  const refreshFeedback = useCallback(() => refetch(), [refetch]);

  return {
    complaints,
    isLoading,
    error: error?.message || null,
    deleteFeedback,
    updateStatus,
    refreshFeedback,
    isDeleting: deleteMutation.isPending,
    isUpdating: statusMutation.isPending,
  };
}

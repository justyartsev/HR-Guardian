import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { documentService } from '../services/documentService';

// Ключи кэша
const DOCUMENTS_KEY = ['documents'];
const PENDING_DOCUMENTS_KEY = ['documents', 'pending'];

/**
 * Форматирование документа для отображения
 */
const formatDocument = (doc, isActiveDoc = true) => {
  const currentVersion = doc.versions?.find(v => v.id === doc.current_version_id);
  const pendingVersion = doc.versions?.find(v => v.sync_status === 'pending');
  const version = isActiveDoc
    ? currentVersion
    : (pendingVersion || currentVersion);

  // Используем display_status от бэкенда если есть, иначе sync_status
  const status = version?.display_status || version?.sync_status || 'pending';

  return {
    id: doc.id,
    type: 'document',
    name: doc.title || 'Без названия',
    date: version?.created_at
      ? new Date(version.created_at).toLocaleDateString('ru-RU')
      : 'Дата не указана',
    effective_from: version?.effective_from
      ? new Date(version.effective_from).toLocaleDateString('ru-RU')
      : null,
    status: status,
    displayStatus: version?.display_status,
    effective_date: version?.effective_from,
    title: doc.title,
    access_level: doc.access_level || 'all',
    versions: doc.versions || [],
    version: doc.versions?.length || 0,
    currentVersionId: doc.current_version_id,
    preview: version?.content || 'Нет предпросмотра',
    owner: doc.owner_name || 'Администратор'
  };
};

/**
 * Хук для управления документами с кэшированием через React Query.
 */
export function useDocuments() {
  const queryClient = useQueryClient();

  // Активные документы (synced)
  const {
    data: allDocuments = [],
    isLoading: isLoadingDocs,
    error: docsError,
    refetch: refetchDocs
  } = useQuery({
    queryKey: DOCUMENTS_KEY,
    queryFn: async () => {
      const docs = await documentService.getDocuments();
      return docs.map(doc => formatDocument(doc, true));
    },
    staleTime: 2 * 60 * 1000, // 2 минуты
    refetchOnMount: false,
  });

  // Только синхронизированные документы (имеющие текущую версию)
  const documents = useMemo(
    () => allDocuments.filter(doc => doc.currentVersionId != null),
    [allDocuments]
  );

  // Ожидающие документы (pending)
  const {
    data: pendingDocuments = [],
    isLoading: isLoadingPending,
    error: pendingError,
    refetch: refetchPending
  } = useQuery({
    queryKey: PENDING_DOCUMENTS_KEY,
    queryFn: async () => {
      const docs = await documentService.getPendingDocuments();
      return docs.map(doc => formatDocument(doc, false));
    },
    staleTime: 2 * 60 * 1000, // 2 минуты
    refetchOnMount: false,
  });

  // Загрузка документа
  const uploadMutation = useMutation({
    mutationFn: async ({ file, effectiveDate, title, accessLevel }) => {
      const doc = await documentService.uploadDocument(file, effectiveDate, title, accessLevel);
      return formatDocument(doc, false);
    },
    onSuccess: async (newDoc) => {
      // Инвалидируем оба списка чтобы они перезагрузились с сервера
      // Документ может быть либо в pending (если дата в будущем)
      // либо сразу в активных (если дата в прошлом)
      await queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      await queryClient.invalidateQueries({ queryKey: PENDING_DOCUMENTS_KEY });
      
      // Также явно рефетчим для гарантии обновления
      refetchDocs();
      refetchPending();
    },
  });

  // Удаление документа
  const deleteMutation = useMutation({
    mutationFn: async (docId) => {
      await documentService.deleteDocument(docId);
      return docId;
    },
    onSuccess: (deletedId) => {
      // Удаляем из обоих списков
      queryClient.setQueryData(DOCUMENTS_KEY, (old = []) =>
        old.filter(doc => doc.id !== deletedId)
      );
      queryClient.setQueryData(PENDING_DOCUMENTS_KEY, (old = []) =>
        old.filter(doc => doc.id !== deletedId)
      );
    },
  });

  // Отмена запланированного обновления
  const cancelUpdateMutation = useMutation({
    mutationFn: async (docId) => {
      const result = await documentService.cancelScheduledUpdate(docId);
      return { docId, result };
    },
    onSuccess: ({ docId }) => {
      // Удаляем из списка ожидающих
      queryClient.setQueryData(PENDING_DOCUMENTS_KEY, (old = []) =>
        old.filter(doc => doc.id !== docId)
      );
      // Перезагружаем оба списка для актуальных данных
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: PENDING_DOCUMENTS_KEY });
    },
  });

  // Восстановление версии документа
  const restoreVersionMutation = useMutation({
    mutationFn: async ({ docId, versionId }) => {
      const doc = await documentService.restoreVersion(docId, versionId);
      return formatDocument(doc, true);
    },
    onSuccess: (restoredDoc) => {
      // Обновляем документ в списке
      queryClient.setQueryData(DOCUMENTS_KEY, (old = []) =>
        old.map(doc => doc.id === restoredDoc.id ? restoredDoc : doc)
      );
      // Перезагружаем для получения актуальных данных
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: PENDING_DOCUMENTS_KEY });
    },
  });

  // Обновление метаданных документа (title, access_level)
  const updateMetadataMutation = useMutation({
    mutationFn: async ({ docId, title, access_level }) => {
      const doc = await documentService.updateDocument(docId, { title, access_level });
      return formatDocument(doc, true);
    },
    onSuccess: (updatedDoc) => {
      // Обновляем документ в списке
      queryClient.setQueryData(DOCUMENTS_KEY, (old = []) =>
        old.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc)
      );
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });

  // Обновление документа (метаданные + опционально новая версия)
  const updateDocument = useCallback(async (updateData) => {
    const { id, title, access_level, effective_from, file } = updateData;

    // 1. Обновляем метаданные если изменились
    if (title || access_level) {
      await updateMetadataMutation.mutateAsync({ docId: id, title, access_level });
    }

    // 2. Если загружен новый файл, создаем новую версию
    if (file) {
      // Определяем формат файла
      const getFileFormat = (file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext || 'txt';
      };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', getFileFormat(file));

      // Добавляем дату вступления в силу, если указана
      if (effective_from) {
        formData.append('effective_from', effective_from);
      }

      // Создаем новую версию через API
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/documents/${id}/versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Не удалось загрузить новую версию документа');
      }
    }

    // Обновляем списки
    queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: PENDING_DOCUMENTS_KEY });
  }, [queryClient, updateMetadataMutation]);

  // Обёртки
  const uploadDocument = useCallback(
    (file, effectiveDate, title, accessLevel) =>
      uploadMutation.mutateAsync({ file, effectiveDate, title, accessLevel }),
    [uploadMutation]
  );

  const deleteDocument = useCallback(
    (docId) => deleteMutation.mutateAsync(docId),
    [deleteMutation]
  );

  const cancelScheduledUpdate = useCallback(
    (docId) => cancelUpdateMutation.mutateAsync(docId),
    [cancelUpdateMutation]
  );

  const restoreVersion = useCallback(
    (docId, versionId) => restoreVersionMutation.mutateAsync({ docId, versionId }),
    [restoreVersionMutation]
  );

  const refreshDocuments = useCallback(() => {
    refetchDocs();
    refetchPending();
  }, [refetchDocs, refetchPending]);

  return {
    documents,
    pendingDocuments,
    isLoading: isLoadingDocs || isLoadingPending,
    error: docsError?.message || pendingError?.message || null,
    uploadDocument,
    deleteDocument,
    cancelScheduledUpdate,
    restoreVersion,
    updateDocument,
    refreshDocuments,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCancelling: cancelUpdateMutation.isPending,
    isRestoring: restoreVersionMutation.isPending,
    isUpdating: updateMetadataMutation.isPending,
  };
}

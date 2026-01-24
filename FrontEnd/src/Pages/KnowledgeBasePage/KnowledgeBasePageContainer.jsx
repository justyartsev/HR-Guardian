import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { KnowledgeBasePage } from "./KnowledgeBasePage";
import { EditDocumentModal } from "../../components/Modal/EditDocumentModal";
import { DeleteDocumentModal } from "../../components/Modal/DeleteDocumentModal";
import { AddDocumentModal } from "../../components/Modal/AddDocumentModal";
import { PreviewDocumentModal } from "../../components/Modal/PreviewDocumentModal";
import { Notification } from "../../components/Notification/Notification";
import { useNotification } from "../../hooks/useNotification";
import { useNotificationCounts } from "../../hooks/useNotificationCounts";
import { useAuth } from "../../hooks/useAuth";
import { useChats } from "../../hooks/useChats";
import { useDocuments } from "../../hooks/useDocuments";
import { formatUserName } from "../../utils/userUtils";

export function KnowledgeBasePageContainer() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();
  const { pendingUsersCount, newFeedbackCount } = useNotificationCounts();

  // Авторизация с проверкой роли HR/admin
  const { currentUser, isAuthenticated, isHR } = useAuth({
    requiredRoles: ['hr', 'admin']
  });

  // Данные из React Query (кэшируются между страницами)
  const {
    chats,
    isLoading: chatsLoading,
    createChat,
    renameChat,
    deleteChat
  } = useChats();

  const {
    documents,
    pendingDocuments,
    isLoading: docsLoading,
    uploadDocument,
    deleteDocument: removeDocument,
    cancelScheduledUpdate,
    restoreVersion,
    updateDocument,
    isRestoring
  } = useDocuments();

  // Модальные окна
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Редирект если не авторизован или нет прав
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isHR) {
    return <Navigate to="/chat" replace />;
  }

  const userName = formatUserName(currentUser);
  const isLoading = chatsLoading || docsLoading;

  // Обработчики чатов
  const handleNewChat = async () => {
    try {
      await createChat();
      navigate('/chat');
    } catch (error) {
      notify({ message: "Не удалось создать чат", type: "error" });
    }
  };

  const handleChatSelect = (chatId) => {
    if (chatId) {
      navigate(`/chat/${chatId}`);
    } else {
      navigate('/chat');
    }
  };

  const handleRenameChat = async (chatId, newName) => {
    try {
      await renameChat(chatId, newName);
    } catch (error) {
      notify({ message: "Не удалось переименовать чат", type: "error" });
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
    } catch (error) {
      notify({ message: "Не удалось удалить чат", type: "error" });
    }
  };

  // Навигация по вкладкам
  const handleTabChange = (tab) => {
    const routes = {
      chat: "/chat",
      knowledge: "/knowledge-base",
      queries: "/query-log",
      users: "/users"
    };
    navigate(routes[tab] || "/chat");
  };

  // Обработчики документов
  const handleEditDocument = (document) => {
    setSelectedDocument(document);
    setIsEditModalOpen(true);
  };

  const handleDeleteDocument = (document) => {
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
  };

  const handlePreviewDocument = (document) => {
    setSelectedDocument(document);
    setIsPreviewModalOpen(true);
  };

  const handleAddDocument = () => setIsAddModalOpen(true);

  const handleSaveDocument = async (updateData) => {
    try {
      await updateDocument(updateData);
      notify({ message: `Документ обновлен успешно`, type: "success" });
      setIsEditModalOpen(false);
    } catch (error) {
      notify({ message: error.message || "Ошибка при обновлении документа", type: "error" });
    }
  };

  const handleAddNewDocument = async (newDocument) => {
    try {
      if (newDocument.file) {
        await uploadDocument(
          newDocument.file,
          newDocument.effective_date,
          newDocument.name,
          newDocument.access_level || 'all'
        );
        // Уведомление отправляется только ПОСЛЕ успешной загрузки
        notify({ message: `Документ "${newDocument.name}" успешно загружен`, type: "success" });
        // Закрываем модальное окно
        setIsAddModalOpen(false);
      }
    } catch (error) {
      notify({ message: error.message || "Ошибка загрузки документа", type: "error" });
    }
  };

  const handleConfirmDelete = async (document) => {
    try {
      await removeDocument(document.id);
      notify({ message: `Документ "${document.name}" удален`, type: "success" });
    } catch (error) {
      notify({ message: "Ошибка удаления документа", type: "error" });
    }
  };

  const handleCancelUpdate = async (document) => {
    try {
      await cancelScheduledUpdate(document.id);
      notify({ message: `Обновление документа "${document.name}" отменено`, type: "success" });
    } catch (error) {
      notify({ message: error.response?.data?.detail || "Ошибка отмены обновления", type: "error" });
    }
  };

  return (
    <>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      )}

      <KnowledgeBasePage
        documents={documents}
        pendingDocuments={pendingDocuments}
        userInfo={{ ...currentUser, username: userName }}
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onEditDocument={handleEditDocument}
        onDeleteDocument={handleDeleteDocument}
        onPreviewDocument={handlePreviewDocument}
        onCancelUpdate={handleCancelUpdate}
        onAddDocument={handleAddDocument}
        isLoading={isLoading}
        pendingUsersCount={pendingUsersCount}
        newFeedbackCount={newFeedbackCount}
      />

      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        document={selectedDocument}
        onSave={handleSaveDocument}
      />

      <DeleteDocumentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        document={selectedDocument}
        onConfirm={handleConfirmDelete}
      />

      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddNewDocument}
      />

      <PreviewDocumentModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={selectedDocument}
        onRestoreVersion={async (docId, versionId) => {
          try {
            await restoreVersion(docId, versionId);
            notify({ message: "Версия документа успешно восстановлена", type: "success" });
            setIsPreviewModalOpen(false);
          } catch (error) {
            notify({ message: error.response?.data?.detail || "Не удалось восстановить версию", type: "error" });
          }
        }}
        isRestoring={isRestoring}
      />
    </>
  );
}

import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { QueryLogPage } from "./QueryLogPage";
import { DeleteDocumentModal } from "../../components/Modal/DeleteDocumentModal";
import { ViewFeedbackModal } from "../../components/Modal/ViewFeedbackModal";
import { Notification } from "../../components/Notification/Notification";
import { useChats } from "../../hooks/useChats";
import { useFeedback } from "../../hooks/useFeedback";
import { useNotification } from "../../hooks/useNotification";
import { useNotificationCounts } from "../../hooks/useNotificationCounts";
import { useAuth } from "../../hooks/useAuth";
import { formatUserName } from "../../utils/userUtils";

export function QueryLogPageContainer() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();
  const { pendingUsersCount, newFeedbackCount, refreshCounts } = useNotificationCounts();

  // Авторизация с проверкой роли
  const { currentUser, isAuthenticated, isHR } = useAuth({
    requiredRoles: ['hr', 'admin']
  });

  // Данные из React Query (кэшируются между страницами)
  const { chats, isLoading: chatsLoading, createChat, renameChat, deleteChat } = useChats();
  const { complaints, isLoading: feedbackLoading, deleteFeedback, updateStatus } = useFeedback();

  // Модальные окна
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Редирект если не авторизован или нет прав
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isHR) return <Navigate to="/chat" replace />;

  const userName = formatUserName(currentUser);
  const isLoading = chatsLoading || feedbackLoading;

  // Обработчики чатов
  const handleNewChat = async () => {
    try {
      await createChat();
      navigate('/chat');
    } catch (error) {
      notify({ message: "Не удалось создать чат", type: "error" });
    }
  };

  const handleChatSelect = (chatId) => navigate(`/chat/${chatId}`);

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

  // Навигация
  const handleTabChange = (tab) => {
    const routes = { chat: "/chat", knowledge: "/knowledge-base", users: "/users" };
    if (routes[tab]) navigate(routes[tab]);
  };

  // Обработчики жалоб
  const handleDeleteComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setIsDeleteModalOpen(true);
  };

  const handleViewComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setIsViewModalOpen(true);
  };

  const handleConfirmDelete = async (complaint) => {
    try {
      await deleteFeedback(complaint.id);
      refreshCounts();
      notify({ message: "Жалоба удалена", type: "success" });
    } catch (error) {
      notify({ message: "Не удалось удалить жалобу", type: "error" });
    }
  };

  const handleStatusChange = async (feedbackId, newStatus) => {
    try {
      await updateStatus(feedbackId, newStatus);
      if (selectedComplaint?.id === feedbackId) {
        setSelectedComplaint(prev => ({ ...prev, status: newStatus }));
      }
      refreshCounts();
    } catch (error) {
      notify({ message: "Не удалось обновить статус жалобы", type: "error" });
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

      <QueryLogPage
        complaints={complaints}
        userInfo={{ ...currentUser, username: userName }}
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onDeleteComplaint={handleDeleteComplaint}
        onViewComplaint={handleViewComplaint}
        isLoading={isLoading}
        pendingUsersCount={pendingUsersCount}
        newFeedbackCount={newFeedbackCount}
      />

      <ViewFeedbackModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        feedback={selectedComplaint}
        onStatusChange={handleStatusChange}
      />

      <DeleteDocumentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        document={selectedComplaint}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

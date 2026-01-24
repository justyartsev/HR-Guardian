import { useNavigate, Navigate } from "react-router-dom";
import { UsersPage } from "./UsersPage";
import { Notification } from "../../components/Notification/Notification";
import { useChats } from "../../hooks/useChats";
import { useUsers } from "../../hooks/useUsers";
import { useNotification } from "../../hooks/useNotification";
import { useNotificationCounts } from "../../hooks/useNotificationCounts";
import { useAuth } from "../../hooks/useAuth";
import { formatUserName } from "../../utils/userUtils";

export function UsersPageContainer() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();
  const { pendingUsersCount, newFeedbackCount, refreshCounts } = useNotificationCounts();

  // Авторизация с проверкой роли
  const { currentUser, isAuthenticated, isHR } = useAuth({
    requiredRoles: ['hr', 'admin']
  });

  // Данные из React Query (кэшируются между страницами)
  const { chats, isLoading: chatsLoading, createChat, renameChat, deleteChat } = useChats();
  const {
    allUsers,
    pendingUsers,
    isLoading: usersLoading,
    approveUser,
    rejectUser,
    changeRole
  } = useUsers();

  // Редирект если не авторизован или нет прав
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isHR) return <Navigate to="/chat" replace />;

  const userName = formatUserName(currentUser);
  const isLoading = chatsLoading || usersLoading;

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
    const routes = { chat: "/chat", knowledge: "/knowledge-base", queries: "/query-log" };
    if (routes[tab]) navigate(routes[tab]);
  };

  // Обработчики пользователей
  const handleApproveUser = async (userId, status, role = null) => {
    try {
      await approveUser(userId, status, role);
      refreshCounts();
      const statusLabel = status === 'approved' ? 'подтверждён' : 'отклонён';
      const roleLabel = role === 'hr' ? ' как HR' : '';
      notify({ message: `Пользователь ${statusLabel}${roleLabel}`, type: "success" });
    } catch (error) {
      notify({ message: "Не удалось изменить статус пользователя", type: "error" });
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      await rejectUser(userId);
      refreshCounts();
      notify({ message: "Пользователь отклонён", type: "success" });
    } catch (error) {
      notify({ message: "Не удалось отклонить пользователя", type: "error" });
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await changeRole(userId, newRole);
      const roleLabel = newRole === 'hr' ? 'HR' : 'сотрудника';
      notify({ message: `Роль изменена на ${roleLabel}`, type: "success" });
    } catch (error) {
      notify({ message: "Не удалось изменить роль пользователя", type: "error" });
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

      <UsersPage
        pendingUsers={pendingUsers}
        allUsers={allUsers}
        userInfo={{ ...currentUser, username: userName }}
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onApproveUser={handleApproveUser}
        onRejectUser={handleRejectUser}
        onChangeRole={handleChangeRole}
        isLoading={isLoading}
        pendingUsersCount={pendingUsersCount}
        newFeedbackCount={newFeedbackCount}
      />
    </>
  );
}

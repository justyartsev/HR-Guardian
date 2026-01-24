import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MainPage } from "./MainPage";
import { ReportMessageModal } from "../../components/Modal/ReportMessageModal";
import { Notification } from "../../components/Notification/Notification";
import { useNotification } from "../../hooks/useNotification";
import { useChatStreaming } from "../../hooks/useChatStreaming";
import { useChats } from "../../hooks/useChats";
import { useNotificationCounts } from "../../hooks/useNotificationCounts";
import { useUser } from "../../contexts/UserContext";
import { authService } from "../../services/authService";
import { feedbackService } from "../../services/feedbackService";
import { formatUserName } from "../../utils/userUtils";

export function MainPageContainer() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const queryClient = useQueryClient();
  const { notification, notify, closeNotification } = useNotification();
  const { clearUserData } = useUser();

  // Использование кастомных хуков
  const {
    chats,
    setChats,
    activeChat,
    activeChatId,
    setActiveChatId,
    isLoading,
    createChat,
    renameChat,
    deleteChat
  } = useChats();

  // Локальные состояния (currentUser нужен для useChatStreaming)
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const { pendingUsersCount, newFeedbackCount, refreshCounts } = useNotificationCounts();
  
  // Настройки чата
  const [enableThinking, setEnableThinking] = useState(() => {
    const saved = localStorage.getItem('enableThinking');
    return saved === 'true';
  });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const { sendStreamingMessage, isStreaming } = useChatStreaming({
    chatId: activeChatId,
    onUpdateChats: setChats,
    currentUser,  // Передаём данные пользователя для персонализации в RAG
    enableThinking  // Режим "размышления" модели
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const userName = formatUserName(currentUser, "Гость");
  const messages = activeChat?.messages || [];

  // Сохраняем настройку thinking в localStorage
  useEffect(() => {
    localStorage.setItem('enableThinking', enableThinking.toString());
  }, [enableThinking]);

  // Инициализация при загрузке
  useEffect(() => {
    const init = async () => {
      // Проверяем авторизацию
      if (!authService.isAuthenticated()) {
        navigate('/login');
        return;
      }

      // Получаем данные пользователя
      const user = await authService.getCurrentUser();
      if (!user) {
        authService.logout();
        navigate('/login');
        return;
      }

      setCurrentUser(user);
    };

    init();
  }, [navigate]);

  // Отслеживаем изменения URL (для прямых ссылок на чат)
  useEffect(() => {
    // Ждём пока чаты загрузятся перед установкой активного чата из URL
    if (isLoading) return;
    
    if (chatId && chats.length > 0) {
      const foundChat = chats.find(chat => chat.id === parseInt(chatId));
      if (foundChat && activeChatId !== foundChat.id) {
        setActiveChatId(foundChat.id);
      }
    }
  }, [chatId, chats, activeChatId, setActiveChatId, isLoading]);

  // Загружаем сообщения при смене активного чата
  useEffect(() => {
    // Флаг для предотвращения race condition
    let isCancelled = false;
    
    const loadMessages = async () => {
      if (!activeChatId) {
        setIsLoadingMessages(false);
        return;
      }

      setIsLoadingMessages(true);
      
      try {
        const { dialogService } = await import('../../services/dialogService');
        const messages = await dialogService.getMessages(activeChatId);
        
        // Не обновляем если компонент размонтирован или чат изменился
        if (isCancelled) return;

        // Преобразуем сообщения в формат UI
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'input' : 'output',
          content: msg.content,
          role: msg.role,
          timestamp: msg.created_at,
          sources: msg.sources || [],
          showReportButton: msg.role === 'assistant'
        }));

        // Проверяем, если последнее сообщение от пользователя без ответа - добавляем сообщение об ошибке
        if (formattedMessages.length > 0) {
          const lastMsg = formattedMessages[formattedMessages.length - 1];
          if (lastMsg.role === 'user') {
            formattedMessages.push({
              id: `error_${Date.now()}`,
              type: 'output',
              content: 'Соединение было прервано. Попробуйте отправить запрос повторно.',
              role: 'assistant',
              timestamp: new Date().toISOString(),
              showReportButton: false,
              isError: true,
              canRetry: true,
              originalQuery: lastMsg.content
            });
          }
        }

        // Обновляем сообщения в активном чате
        setChats(prevChats => {
          const currentChat = prevChats.find(c => c.id === activeChatId);
          // Не обновляем если сообщения уже загружены
          if (currentChat?.messages?.length > 0) return prevChats;
          
          return prevChats.map(chat =>
            chat.id === activeChatId
              ? { ...chat, messages: formattedMessages }
              : chat
          );
        });
      } catch (error) {
        // Ignore
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages();
    
    return () => {
      isCancelled = true;
    };
  }, [activeChatId, setChats]); // Убрали chats из зависимостей

  // Обработчики пользовательских действий
  const handleSendMessage = async () => {
    console.log('[MAIN] handleSendMessage called', { inputValue, isStreaming, activeChatId });

    if (!inputValue.trim() || isStreaming) return;

    const messageText = inputValue.trim();
    setInputValue("");

    try {
      // Если нет активного чата — создаём новый
      let targetChatId = activeChatId;
      console.log('[MAIN] Current targetChatId:', targetChatId);

      if (!targetChatId) {
        console.log('[MAIN] Creating new chat...');
        targetChatId = await createChat();
        console.log('[MAIN] New chat created:', targetChatId);
      }

      // СНАЧАЛА сохраняем сообщение пользователя в БД
      console.log('[MAIN] Saving user message to DB...', { targetChatId, messageText, role: 'user' });
      const { dialogService } = await import('../../services/dialogService');
      const userMessage = await dialogService.sendMessage(targetChatId, messageText, 'user');
      console.log('[MAIN] User message saved:', userMessage);

      // Добавляем сохранённое сообщение пользователя в UI
      let currentMessages = [];
      setChats(prevChats =>
        prevChats.map(chat => {
          if (chat.id === targetChatId) {
            currentMessages = chat.messages; // Сохраняем текущие сообщения для контекста
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: userMessage.id,
                  type: "input",
                  content: messageText,
                  timestamp: userMessage.created_at,
                  role: "user"
                }
              ]
            };
          }
          return chat;
        })
      );

      // Отправляем с контекстом последних сообщений
      await sendStreamingMessage(messageText, targetChatId, currentMessages);
    } catch (error) {
      notify({
        message: "Ошибка отправки сообщения",
        type: "error"
      });
    }
  };

  const handleNewChat = async () => {
    try {
      // Очищаем состояние редактирования и ввода
      setEditingMessageId(null);
      setEditingContent("");
      setInputValue("");
      
      // Очищаем активный чат и сообщения
      setActiveChatId(null);
      
      // Навигируем на главную страницу (без ID чата)
      navigate("/chat");
      
      // ПОСЛЕ навигации создаём новый чат
      const newChatId = await createChat();
      
      // Очищаем сообщения в новом чате
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === newChatId ? { ...chat, messages: [] } : chat
        )
      );
      
      // Устанавливаем активный чат
      setActiveChatId(newChatId);
      navigate(`/chat/${newChatId}`);
    } catch (error) {
      notify({
        message: "Не удалось создать новый чат",
        type: "error"
      });
    }
  };

  // Повтор последнего сообщения при ошибке
  const handleRetryMessage = async (errorMessage) => {
    console.log('[MAIN] handleRetryMessage called', { errorMessage, activeChatId, isStreaming });

    if (!errorMessage?.originalQuery) {
      notify({
        message: "Невозможно повторить запрос",
        type: "error"
      });
      return;
    }

    const originalQuery = errorMessage.originalQuery;
    console.log('[MAIN] Retrying query:', originalQuery);

    // Удаляем сообщение об ошибке из чата и получаем текущие сообщения
    let currentMessages = [];
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === activeChatId) {
          const filteredMessages = chat.messages.filter(msg => msg.id !== errorMessage.id);
          currentMessages = filteredMessages;
          return {
            ...chat,
            messages: filteredMessages
          };
        }
        return chat;
      })
    );

    console.log('[MAIN] Current messages for context:', currentMessages.length);

    // Повторно отправляем запрос с контекстом
    try {
      console.log('[MAIN] Calling sendStreamingMessage...');
      await sendStreamingMessage(originalQuery, activeChatId, currentMessages);
    } catch (error) {
      console.error('[MAIN] Error in sendStreamingMessage:', error);
    }
  };

  // Начать редактирование сообщения
  const handleStartEditMessage = (message) => {
    if (message.type !== 'input' || isStreaming) return;
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  // Сохранение отредактированного сообщения и повторная отправка
  const handleSaveEdit = async (messageId) => {
    if (!editingContent.trim() || isStreaming) return;

    const newContent = editingContent.trim();
    
    // Находим индекс редактируемого сообщения
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Удаляем все сообщения после редактируемого (включая ответы)
    // и обновляем текст редактируемого сообщения
    let messagesBeforeEdit = [];
    setChats(prevChats =>
      prevChats.map(chat => {
        if (chat.id === activeChatId) {
          const newMessages = chat.messages.slice(0, messageIndex);
          messagesBeforeEdit = newMessages;
          return {
            ...chat,
            messages: [
              ...newMessages,
              {
                ...chat.messages[messageIndex],
                content: newContent
              }
            ]
          };
        }
        return chat;
      })
    );

    setEditingMessageId(null);
    setEditingContent("");

    // Обновляем сообщение в БД
    try {
      const { dialogService } = await import('../../services/dialogService');
      await dialogService.updateMessage(messageId, newContent);
    } catch (error) {
      // Ignore DB error, continue with streaming
    }

    // Отправляем новый запрос
    try {
      await sendStreamingMessage(newContent, activeChatId, messagesBeforeEdit);
    } catch (error) {
      // Ignore
    }
  };

  // Переключение режима thinking
  const handleToggleThinking = () => {
    setEnableThinking(prev => !prev);
  };

  const handleChatSelect = (chatId) => {
    setActiveChatId(chatId);
    navigate(`/chat/${chatId}`);
  };

  const handleRenameChat = async (chatId, newName) => {
    try {
      await renameChat(chatId, newName);
      notify({
        message: "Чат переименован",
        type: "success"
      });
    } catch (error) {
      notify({
        message: "Не удалось переименовать чат",
        type: "error"
      });
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      if (activeChatId === chatId) {
        navigate("/");
      }
      notify({
        message: "Чат удалён",
        type: "success"
      });
    } catch (error) {
      notify({
        message: "Не удалось удалить чат",
        type: "error"
      });
    }
  };

  const handleReportMessage = (message) => {
    setSelectedMessage(message);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async (reportData) => {
    try {
      await feedbackService.submitReport(selectedMessage.id, {
        dialog_id: activeChatId,
        comment: reportData.comment || '',
        rating: null
      });

      notify({
        message: "Спасибо за обратную связь!",
        type: "success"
      });
      setIsReportModalOpen(false);
      setSelectedMessage(null);

      refreshCounts();
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    } catch (error) {
      notify({
        message: "Ошибка при отправке отзыва",
        type: "error"
      });
    }
  };

  const handleLogout = () => {
    // Очищаем данные через централизованные функции
    authService.logout();
    clearUserData();
    // Используем React Router для навигации (без перезагрузки страницы)
    navigate('/login', { replace: true });
  };

  const handleInputChange = (value) => {
    setInputValue(value);
  };

  const handleUpdateProfile = async ({ firstName, lastName, position, department }) => {
    try {
      const updatedUser = await authService.updateProfile({ firstName, lastName, position, department });
      setCurrentUser(updatedUser);
      notify({
        message: "Профиль обновлён",
        type: "success"
      });
    } catch (error) {
      notify({
        message: "Не удалось обновить профиль",
        type: "error"
      });
    }
  };

  // Навигация между вкладками
  const handleTabChange = (tabName) => {
    switch (tabName) {
      case 'knowledge':
        navigate('/knowledge-base');
        break;
      case 'queries':
        navigate('/query-log');
        break;
      case 'users':
        navigate('/users');
        break;
      case 'chat':
      default:
        navigate('/chat');
        break;
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

      <MainPage
        inputValue={inputValue}
        messages={messages}
        chats={chats}
        currentUser={currentUser}
        userName={userName}
        firstName={currentUser?.firstName || ""}
        lastName={currentUser?.lastName || ""}
        position={currentUser?.position || ""}
        department={currentUser?.department || ""}
        activeChatId={activeChatId}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onReportMessage={handleReportMessage}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onUpdateProfile={handleUpdateProfile}
        onTabChange={handleTabChange}
        onRetryMessage={handleRetryMessage}
        onLogout={handleLogout}
        isLoading={isLoading}
        isLoadingMessages={isLoadingMessages}
        isStreamingResponse={isStreaming}
        pendingUsersCount={pendingUsersCount}
        newFeedbackCount={newFeedbackCount}
        // Новые props для thinking и редактирования
        enableThinking={enableThinking}
        onToggleThinking={handleToggleThinking}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        onEditingContentChange={setEditingContent}
        onStartEditMessage={handleStartEditMessage}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />

      <ReportMessageModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        message={selectedMessage}
        onReport={handleSubmitReport}
      />
    </>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainPage } from "./MainPage";
import { ReportMessageModal } from "../../components/Modal/ReportMessageModal";
import { dialogService } from "../../services/dialogService";
import { authService } from "../../services/authService";
import { queryService } from "../../services/queryService";

// Функция для форматирования имени пользователя
const formatUserName = (user) => {
  if (!user) return "Гость";
  
  if (user.firstName && user.lastName) {
    return `${user.lastName} ${user.firstName}`;
  }
  
  if (user.username) {
    return user.username;
  }
  
  return user.email?.split('@')[0] || "Пользователь";
};

// Функция для получения следующего номера чата
const getNextChatNumber = (existingChats) => {
  const chatNumbers = existingChats
    .map(chat => {
      const match = chat.name.match(/^Чат (\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
  return chatNumbers.length > 0 ? Math.max(...chatNumbers) + 1 : 1;
};

export function MainPageContainer() {
  const navigate = useNavigate();
  
  // Состояния
  const [currentUser, setCurrentUser] = useState(() => {
    return authService.getCurrentUser();
  });
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Получаем отформатированное имя пользователя
  const userName = formatUserName(currentUser);

  // При загрузке проверяем авторизацию и загружаем данные
  useEffect(() => {
    const init = async () => {
      // 1. Проверяем токен
      if (!authService.isAuthenticated()) {
        navigate('/login');
        return;
      }

      // 2. Получаем данные пользователя
      const user = await authService.getCurrentUser();
      if (!user) {
        authService.logout();
        navigate('/login');
        return;
      }
      
      setCurrentUser(user);
      
      // 3. Загружаем диалоги пользователя из бэкенда
      await loadUserDialogs(user.id);
      
      setIsLoading(false);
    };

    init();
  }, [navigate]);

  // Загрузка диалогов из бэкенда
  const loadUserDialogs = async (userId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const dialogs = await dialogService.getUserDialogs(userId);
      
      // ДИАГНОСТИКА: логируем структуру данных
      console.log('=== LOADING DIALOGS ===');
      console.log('User ID:', userId);
      console.log('Raw dialogs from backend:', dialogs);
      
      if (dialogs && dialogs.length > 0) {
        console.log('First dialog structure:', dialogs[0]);
        console.log('Dialog keys:', Object.keys(dialogs[0]));
        
        // Сортируем диалоги по дате создания (новые сверху)
        const sortedDialogs = [...dialogs].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        // Загружаем существующие чаты из localStorage для сохранения переименований
        const storedChats = JSON.parse(localStorage.getItem('hrg_chats') || '[]');
        const storedChatsMap = new Map(storedChats.map(chat => [chat.id, chat]));
        
        // Форматируем чаты, сохраняя переименованные названия
        const formattedChats = await Promise.all(sortedDialogs.map(async (dialog) => {
          const storedChat = storedChatsMap.get(dialog.id);
          
          // Загружаем сообщения для каждого диалога
          let messages = [];
          try {
            const messagesData = await dialogService.getMessages(dialog.id);
            messages = messagesData.map(msg => ({
              id: msg.id,
              type: msg.sender === 'user' ? 'input' : 'output',
              content: msg.text,
              showReportButton: msg.sender !== 'user',
              timestamp: msg.created_at,
            }));
            console.log(`Loaded ${messages.length} messages for dialog ${dialog.id}`);
          } catch (msgError) {
            console.error(`Error loading messages for dialog ${dialog.id}:`, msgError);
          }
          
          return {
            id: dialog.id,
            name: storedChat?.name || dialog.title || `Чат ${getNextChatNumber([])}`,
            messages: messages,
          };
        }));
        
        setChats(formattedChats);
        setActiveChatId(formattedChats[0]?.id || null);
        
        // Сохраняем локально как кэш
        localStorage.setItem('hrg_chats', JSON.stringify(formattedChats));
      } else {
        // Нет диалогов - пустой список
        console.log('No dialogs found for user');
        setChats([]);
        setActiveChatId(null);
        localStorage.removeItem('hrg_chats');
      }
    } catch (error) {
      console.error('Error loading dialogs:', error);
      setError('Не удалось загрузить диалоги');
      
      // Fallback: пытаемся загрузить из localStorage
      try {
        const savedChats = localStorage.getItem('hrg_chats');
        if (savedChats) {
          const parsedChats = JSON.parse(savedChats);
          setChats(parsedChats);
          setActiveChatId(parsedChats[0]?.id || null);
          console.log('Loaded chats from localStorage fallback');
        } else {
          setChats([]);
        }
      } catch (fallbackError) {
        console.error('Fallback loading error:', fallbackError);
        setChats([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Создание нового чата
  const handleNewChat = async () => {
    if (!currentUser?.id) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    
    try {
      const nextNumber = getNextChatNumber(chats);
      const chatName = `Чат ${nextNumber}`;
      
      const newDialog = await dialogService.createDialog(chatName, currentUser.id);
      
      console.log('New dialog response:', newDialog);
      
      const newChat = {
        id: newDialog.id || newDialog.dialog_id,
        name: newDialog.title || chatName,
        messages: [],
      };
      
      // Добавляем новый чат в начало списка
      const updatedChats = [newChat, ...chats];
      setChats(updatedChats);
      setActiveChatId(newChat.id);
      setInputValue("");
      
      // Сохраняем локально
      localStorage.setItem('hrg_chats', JSON.stringify(updatedChats));
      
      console.log("Создан новый чат:", newChat.name);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Не удалось создать чат');
      
      // Fallback: создаем локальный чат
      const newChatId = Date.now();
      const nextNumber = getNextChatNumber(chats);
      const chatName = `Чат ${nextNumber}`;
      
      const newChat = {
        id: newChatId,
        name: chatName,
        messages: []
      };
      
      const updatedChats = [newChat, ...chats];
      setChats(updatedChats);
      setActiveChatId(newChatId);
      localStorage.setItem('hrg_chats', JSON.stringify(updatedChats));
    } finally {
      setIsLoading(false);
    }
  };

  // Переименование чата
  const handleRenameChat = async (chatId, newName) => {
    try {
      // Обновляем в бэкенде
      await dialogService.updateDialogTitle(chatId, newName);
    } catch (error) {
      console.error('Error updating chat title in backend:', error);
    }
    
    // Обновляем локально
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, name: newName } : chat
    );
    
    setChats(updatedChats);
    localStorage.setItem('hrg_chats', JSON.stringify(updatedChats));
    
    console.log(`Чат переименован: ${newName}`);
  };

  // Удаление чата БЕЗ перенумерации
  const handleDeleteChat = async (chatId) => {
    if (chats.length <= 1) {
      alert("Нельзя удалить последний чат");
      return;
    }
    
    if (!window.confirm("Вы уверены, что хотите удалить этот чат?")) {
      return;
    }
    
    try {
      // Удаляем из бэкенда
      await dialogService.deleteDialog(chatId);
    } catch (error) {
      console.error('Error deleting from backend:', error);
    }
    
    // Удаляем локально БЕЗ перенумерации
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);
    
    if (chatId === activeChatId) {
      setActiveChatId(updatedChats[0]?.id || null);
    }
    
    localStorage.setItem('hrg_chats', JSON.stringify(updatedChats));
  };

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentUser?.id || !activeChatId) return;

    const messageText = inputValue.trim();
    setInputValue("");
    
    try {
      // 1. Сохраняем сообщение пользователя в бэкенд
      const savedMessage = await dialogService.sendMessage(
        activeChatId, 
        messageText, 
        'user'
      );
      
      console.log('Saved user message:', savedMessage);
      
      // 2. Обновляем локальное состояние
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, {
                id: savedMessage.id,
                type: "input",
                content: savedMessage.text,
                showReportButton: false,
                timestamp: savedMessage.created_at,
              }]
            } 
          : chat
      ));
      
      // 3. Обновляем localStorage
      updateLocalStorage();
      
 // 3. ПОЛУЧАЕМ РЕАЛЬНЫЙ ОТВЕТ ОТ НЕЙРОННОЙ СЕТИ
    try {
      console.log('Sending query to AI service...');
      const aiResponse = await queryService.processQuery(activeChatId, messageText);
      
      console.log('AI response received:', aiResponse);
      
      // Сохраняем ответ AI в бэкенд
      const aiMessage = await dialogService.sendMessage(
        activeChatId, 
        aiResponse.answer || aiResponse.text || aiResponse, 
        'ai'
      );
      
      // Обновляем UI с ответом AI
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, {
                id: aiMessage.id,
                type: "output",
                content: aiMessage.text,
                showReportButton: true,
                timestamp: aiMessage.created_at,
              }]
            } 
          : chat
      ));
      
      updateLocalStorage();
      
    } catch (aiError) {
      console.error('Error getting AI response:', aiError);
      
      // Fallback: стандартный ответ
      const fallbackResponse = `Извините, не удалось получить ответ от нейронной сети. Ошибка: ${aiError.message}`;
      
      const aiMessage = await dialogService.sendMessage(
        activeChatId, 
        fallbackResponse, 
        'ai'
      );
      
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, {
                id: aiMessage.id,
                type: "output",
                content: aiMessage.text,
                showReportButton: true,
                timestamp: aiMessage.created_at,
              }]
            } 
          : chat
      ));
      
      updateLocalStorage();
    }
    
  } catch (error) {
    console.error('Error in send message flow:', error);
        // Если это 401, просто покажем ошибку
    if (error.response?.status === 401) {
      setError(`Ошибка авторизации (401) при запросе к: ${error.config?.url}`);
    } else {
      setError('Не удалось отправить сообщение');
    }
   
    
    // Fallback логика
    const userMessage = {
      id: Date.now(),
      type: "input",
      content: messageText,
      showReportButton: false,
      timestamp: new Date().toISOString(),
    };
    
    setChats(prev => prev.map(chat => 
      chat.id === activeChatId 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    
    updateLocalStorage();
  }
};

  // Вспомогательная функция
  const updateLocalStorage = () => {
    try {
      localStorage.setItem('hrg_chats', JSON.stringify(chats));
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  };

  // Обработчик выбора чата с загрузкой сообщений
  const handleChatSelect = async (chat) => {
    console.log('Selecting chat:', chat.id);
    setActiveChatId(chat.id);
    setInputValue("");
    
    // Загружаем сообщения для выбранного чата
    if (chat.id) {
      try {
        console.log('Loading messages for chat:', chat.id);
        const messages = await dialogService.getMessages(chat.id);
        console.log('Loaded messages:', messages);
        
        // Обновляем чат с загруженными сообщениями
        setChats(prev => prev.map(c => 
          c.id === chat.id 
            ? { 
                ...c, 
                messages: messages.map(msg => ({
                  id: msg.id,
                  type: msg.sender === 'user' ? 'input' : 'output',
                  content: msg.text,
                  showReportButton: msg.sender !== 'user',
                  timestamp: msg.created_at,
                }))
              } 
            : c
        ));
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }
  };

  const handleReportMessage = (message) => {
    setSelectedMessage(message);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = (reportData) => {
    console.log("Жалоба отправлена:", reportData);
    alert(`Жалоба отправлена!`);
  };

  const handleInputChange = (value) => {
    setInputValue(value);
  };

  const handleTabChange = (tab) => {
    if (tab === "knowledge") {
      navigate("/knowledge-base");
    } else if (tab === "queries") {
      navigate("/query-log");
    } else if (tab === "chat") {
      navigate("/chat");
    }
  };

  // Функция выхода
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  // Получаем активный чат
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messages = activeChat?.messages || [];

  return (
    <>
      {error && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'var(--secondary-red-1)',
          color: 'white',
          padding: '1rem',
          borderRadius: '5px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.6rem'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      <MainPage
        inputValue={inputValue}
        messages={messages}
        chats={chats}
        currentUser={currentUser}
        userName={userName}
        activeChatId={activeChatId}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onReportMessage={handleReportMessage}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onTabChange={handleTabChange}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onLogout={handleLogout}
        isLoading={isLoading}
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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainPage } from "./MainPage";
import { ReportMessageModal } from "../../components/Modal/ReportMessageModal";
import { dialogService } from "../../services/dialogService";
import { authService } from "../../services/authService";

// Функция для генерации имени нового чата (локально, пока нет бэкенда)
const generateChatName = (existingChats) => {
  const chatNumbers = existingChats
    .map(chat => {
      const match = chat.name.match(/Чат (\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
  const nextNumber = chatNumbers.length > 0 ? Math.max(...chatNumbers) + 1 : 1;
  return `Чат ${nextNumber}`;
};

export function MainPageContainer() {
  const navigate = useNavigate();
  
  // Получаем текущего пользователя
  const [currentUser, setCurrentUser] = useState(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    return userData || { username: "Петров Пётр Петрович" };
  });

  // Состояние для чатов
  const [chats, setChats] = useState(() => {
    const savedChats = localStorage.getItem('hrg_chats');
    if (savedChats) {
      return JSON.parse(savedChats);
    }
    // Начальные чаты
    return [
      { id: 1, name: "Чат 1", messages: [
        {
          id: 1,
          type: "input",
          content: "Покажи дату моей следующей аттестации",
          showReportButton: false,
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          type: "output",
          content: "Дата вашей следующей аттестации - 20.10.2025. Если вы хотите посмотреть соответствующий документ, то вот он – 'Ссылка'",
          showReportButton: true,
          timestamp: new Date().toISOString()
        }
      ]},
      { id: 2, name: "Чат 2", messages: [] }
    ];
  });

  // Текущий активный чат
  const [activeChatId, setActiveChatId] = useState(chats[0]?.id || null);
  
  // Состояния для модального окна жалобы
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Текущий ввод сообщения
  const [inputValue, setInputValue] = useState("");
  
  // Флаг загрузки данных с бэкенда
  const [loadingBackendData, setLoadingBackendData] = useState(false);

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      if (!authService.isAuthenticated()) {
        // Если нет токена, редирект на логин
        navigate('/login');
        return;
      }
      
      // Пытаемся получить пользователя
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Загружаем диалоги с бэкенда при наличии пользователя
  useEffect(() => {
    const loadBackendDialogs = async () => {
      if (!currentUser?.id) return;
      
      setLoadingBackendData(true);
      try {
        const dialogs = await dialogService.getUserDialogs(currentUser.id);
        
        if (dialogs.length > 0) {
          // Преобразуем данные бэкенда в формат фронтенда
          const formattedChats = dialogs.map(dialog => ({
            id: dialog.id,
            name: dialog.title || `Чат ${dialog.id}`,
            messages: dialog.messages?.map(msg => ({
              id: msg.id,
              type: msg.sender === 'user' ? 'input' : 'output',
              content: msg.text,
              showReportButton: msg.sender !== 'user',
              timestamp: msg.created_at,
            })) || [],
          }));
          
          setChats(formattedChats);
          if (formattedChats.length > 0) {
            setActiveChatId(formattedChats[0].id);
          }
          
          // Сохраняем в localStorage как резервную копию
          localStorage.setItem('hrg_chats', JSON.stringify(formattedChats));
        }
      } catch (error) {
        console.error('Error loading dialogs from backend:', error);
        // Продолжаем работу с локальными данными при ошибке
      } finally {
        setLoadingBackendData(false);
      }
    };
    
    loadBackendDialogs();
  }, [currentUser?.id]);

  // Сохраняем чаты в localStorage при изменении (как резервная копия)
  useEffect(() => {
    if (!loadingBackendData) {
      localStorage.setItem('hrg_chats', JSON.stringify(chats));
    }
  }, [chats, loadingBackendData]);

  // Получаем активный чат
  const activeChat = chats.find(chat => chat.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];

  // Создание нового чата
  const handleNewChat = async () => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    try {
      // Пытаемся создать чат в бэкенде
      if (currentUser?.id) {
        const newDialog = await dialogService.createDialog(null, currentUser.id);
        
        const newChat = {
          id: newDialog.id,
          name: newDialog.title || `Чат ${newDialog.id}`,
          messages: [],
        };
        
        setChats(prev => [...prev, newChat]);
        setActiveChatId(newChat.id);
        setInputValue("");
        
        console.log("Создан новый чат в бэкенде:", newChat.name);
        return;
      }
    } catch (error) {
      console.error('Error creating chat in backend:', error);
      // При ошибке создаем локальный чат
    }
    
    // Создаем локальный чат при ошибке или отсутствии пользователя
    const newChatId = Date.now();
    const newChatName = generateChatName(chats);
    
    const newChat = {
      id: newChatId,
      name: newChatName,
      messages: []
    };
    
    setChats(prev => [...prev, newChat]);
    setActiveChatId(newChatId);
    setInputValue("");
    
    console.log("Создан новый локальный чат:", newChatName);
  };

  // Выбор чата
  const handleChatSelect = (chat) => {
    setActiveChatId(chat.id);
    setInputValue("");
    console.log("Выбран чат:", chat.name);
  };

  // Переименование чата
  const handleRenameChat = async (chatId, newName) => {
    try {
      // Пытаемся обновить в бэкенде
      await dialogService.updateDialogTitle(chatId, newName);
    } catch (error) {
      console.error('Error updating chat title in backend:', error);
    }
    
    // Обновляем локально
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, name: newName } : chat
    ));
    
    console.log(`Чат ${chatId} переименован в:`, newName);
  };

  // Удаление чата
  const handleDeleteChat = async (chatId) => {
    if (chats.length <= 1) {
      alert("Нельзя удалить последний чат");
      return;
    }
    
    try {
      // Пытаемся удалить из бэкенда
      await dialogService.deleteDialog(chatId);
    } catch (error) {
      console.error('Error deleting chat from backend:', error);
    }
    
    // Удаляем локально
    setChats(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId);
      if (chatId === activeChatId) {
        setActiveChatId(filtered[0]?.id || null);
      }
      return filtered;
    });
    
    console.log("Удален чат:", chatId);
  };

  // Отправка сообщения в активный чат
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Проверяем авторизацию
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: "input",
      content: inputValue,
      showReportButton: false,
      timestamp: new Date().toISOString()
    };
    
    // Обновляем сообщения в активном чате локально
    setChats(prev => prev.map(chat => 
      chat.id === activeChatId 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    
    setInputValue("");
    
    try {
      // Отправляем сообщение в бэкенд
      if (currentUser?.id) {
        await dialogService.sendMessage(activeChatId, inputValue, 'user');
      }
    } catch (error) {
      console.error('Error sending message to backend:', error);
    }
    
    // Имитация ответа от AI
    setTimeout(async () => {
      const aiResponse = `Это ответ на ваш вопрос: "${inputValue}". В реальном приложении здесь будет ответ от нейронной сети.`;
      
      const botMessage = {
        id: Date.now() + 1,
        type: "output",
        content: aiResponse,
        showReportButton: true,
        timestamp: new Date().toISOString()
      };
      
      // Обновляем локально
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: [...chat.messages, botMessage] }
          : chat
      ));
      
      try {
        // Отправляем ответ AI в бэкенд
        if (currentUser?.id) {
          await dialogService.sendMessage(activeChatId, aiResponse, 'ai');
        }
      } catch (error) {
        console.error('Error sending AI response to backend:', error);
      }
    }, 1000);
  };

  // Обработчик открытия модалки жалобы
  const handleReportMessage = (message) => {
    setSelectedMessage(message);
    setIsReportModalOpen(true);
  };

  // Обработчик отправки жалобы
  const handleSubmitReport = (reportData) => {
    console.log("Жалоба отправлена:", reportData);
    
    // Временная логика
    const existingReports = JSON.parse(localStorage.getItem('chat_reports') || '[]');
    const newReport = {
      ...reportData,
      id: Date.now(),
      chatId: activeChatId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    existingReports.push(newReport);
    localStorage.setItem('chat_reports', JSON.stringify(existingReports));
    
    alert(`Жалоба отправлена! ID: ${newReport.id}`);
  };

  // Обработчики без изменений
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
    navigate('/login');
  };

  return (
    <>
      <MainPage
        inputValue={inputValue}
        messages={messages}
        chats={chats}
        currentUser={currentUser}
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
        isLoading={loadingBackendData}
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
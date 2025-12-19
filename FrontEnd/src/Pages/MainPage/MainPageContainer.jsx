import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainPage } from "./MainPage";
import { ReportMessageModal } from "../../components/Modal/ReportMessageModal";

// Функция для генерации уникального ID чата
const generateChatId = () => Date.now();

// Функция для генерации имени нового чата
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
  
  // Состояние для чатов
  const [chats, setChats] = useState(() => {
    // Загружаем чаты из localStorage при инициализации
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

  // Сохраняем чаты в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('hrg_chats', JSON.stringify(chats));
  }, [chats]);

  // Получаем активный чат
  const activeChat = chats.find(chat => chat.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];

  // Создание нового чата
  const handleNewChat = () => {
    const newChatId = generateChatId();
    const newChatName = generateChatName(chats);
    
    const newChat = {
      id: newChatId,
      name: newChatName,
      messages: []
    };
    
    setChats(prev => [...prev, newChat]);
    setActiveChatId(newChatId);
    setInputValue("");
    
    console.log("Создан новый чат:", newChatName);
  };

  // Выбор чата
  const handleChatSelect = (chat) => {
    setActiveChatId(chat.id);
    setInputValue("");
    console.log("Выбран чат:", chat.name);
  };

  // Переименование чата
  const handleRenameChat = (chatId, newName) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, name: newName } : chat
    ));
    console.log(`Чат ${chatId} переименован в:`, newName);
  };

  // Удаление чата
  const handleDeleteChat = (chatId) => {
    if (chats.length <= 1) {
      alert("Нельзя удалить последний чат");
      return;
    }
    
    setChats(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId);
      // Если удаляем активный чат, переключаемся на первый доступный
      if (chatId === activeChatId) {
        setActiveChatId(filtered[0]?.id || null);
      }
      return filtered;
    });
    
    console.log("Удален чат:", chatId);
  };

  // Отправка сообщения в активный чат
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: "input",
      content: inputValue,
      showReportButton: false,
      timestamp: new Date().toISOString()
    };
    
    // Обновляем сообщения в активном чате
    setChats(prev => prev.map(chat => 
      chat.id === activeChatId 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    
    setInputValue("");
    
    // Имитация ответа от бота
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        type: "output",
        content: `Это ответ на ваш вопрос: "${inputValue}". В реальном приложении здесь будет ответ от нейронной сети.`,
        showReportButton: true,
        timestamp: new Date().toISOString()
      };
      
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: [...chat.messages, botMessage] }
          : chat
      ));
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

  return (
    <>
      <MainPage
        inputValue={inputValue}
        messages={messages}
        chats={chats}
        activeChatId={activeChatId} 
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onReportMessage={handleReportMessage}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onTabChange={handleTabChange}
        onRenameChat={handleRenameChat}    // Добавляем
        onDeleteChat={handleDeleteChat} 
        username="Петров Пётр Петрович"
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
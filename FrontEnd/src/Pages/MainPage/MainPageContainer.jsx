// src/pages/MainPage/MainPage.container.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainPage } from "./MainPage";

export function MainPageContainer() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([
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
  ]);
  
  const [chats] = useState([
    { id: 1, name: "Чат: 1" },
    { id: 2, name: "Чат 2" },
  ]);

  // Обработчик изменения текста в поле ввода
  const handleInputChange = (value) => {
    setInputValue(value);
  };

  // Обработчик отправки сообщения
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: "input",
      content: inputValue,
      showReportButton: false,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        type: "output",
        content: `Это ответ на ваш вопрос: "${inputValue}". В реальном приложении здесь будет ответ от нейронной сети.`,
        showReportButton: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  // Обработчик жалобы на сообщение
  const handleReportMessage = (message) => {
    console.log("Жалоба на сообщение:", message);
    alert(`Жалоба отправлена на сообщение: "${message.content}"`);
  };

  // Обработчики для бокового меню
  const handleNewChat = () => {
    alert("Создание нового чата");
  };

  const handleChatSelect = (chat) => {
    console.log("Выбран чат:", chat);
  };

  // Обработчик смены вкладок с навигацией
  const handleTabChange = (tab) => {
    if (tab === "knowledge") {
      navigate("/knowledge-base");
    } else if (tab === "queries") {
      // navigate("/query-log");
      alert("Страница журнала запросов еще не реализована");
    } else if (tab === "chat") {
      navigate("/chat");
    }
  };

  return (
    <MainPage
      inputValue={inputValue}
      messages={messages}
      chats={chats}
      onInputChange={handleInputChange}
      onSendMessage={handleSendMessage}
      onReportMessage={handleReportMessage}
      onNewChat={handleNewChat}
      onChatSelect={handleChatSelect}
      onTabChange={handleTabChange}
      username="Петров Пётр Петрович"
    />
  );
}
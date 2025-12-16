import styled from "styled-components";
import SideMenu from "../components/SideMenu/SideMenu";
import { Message } from "../components/Message/message";
import { Input } from "../components/input/Input";
import { useState } from "react";

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--primary-black-2); /* Изменяем фон */
  color: var(--primary-white-1);
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem 3rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    135deg,
    var(--primary-black-1) 0%,
    var(--primary-black-3) 100%
  );
`;

const MessagesContainer = styled.div`
  flex: 1;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputContainer = styled.div`
  margin-top: auto;
  padding: 1rem 0;
  background: linear-gradient(
    transparent,
    var(--primary-black-3) 30%
  );
`;

const Title = styled.h1`
  font-size: 3.2rem;
  color: var(--primary-white-1);
  margin-bottom: 2rem;
  font-weight: 600;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--primasy-stroke-1);
`;

export function MainPage() {
  // Состояния для управления вводом и сообщениями
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([
    // Начальный диалог: пользователь спрашивает
    {
      id: 1,
      type: "input", // Сообщение от пользователя - справа
      content: "Покажи дату моей следующей аттестации",
      showReportButton: false,
      timestamp: new Date().toISOString()
    },
    // Ответ системы
    {
      id: 2,
      type: "output", // Сообщение от системы - слева
      content: "Дата вашей следующей аттестации - 20.10.2025. Если вы хотите посмотреть соответствующий документ, то вот он – 'Ссылка'",
      showReportButton: true,
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [chats] = useState([
    { id: 1, name: "Чат: 6ол" },
    { id: 2, name: "Чат 1" },
  ]);

  // Обработчик изменения текста в поле ввода
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Обработчик отправки сообщения
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Добавляем сообщение пользователя
    const userMessage = {
      id: Date.now(),
      type: "input", // Пользователь - справа
      content: inputValue,
      showReportButton: false,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    
    // Имитация ответа от нейронки (заглушка)
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        type: "output", // Система - слева
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

  const handleTabChange = (tab) => {
    console.log("Выбрана вкладка:", tab);
  };

  return (
    <LayoutContainer>
      {/* Боковое меню */}
      <SideMenu 
        active="chat"
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        username="Петров Пётр Петрович"
        onChatSelect={handleChatSelect}
      />
      
      {/* Основной контент */}
      <MainContent>
        {/* Заголовок */}
        <Title>HR-Guardian</Title>
        
        {/* Контейнер сообщений */}
        <MessagesContainer>
          {/* Отображаем все сообщения */}
          {messages.map((msg) => (
            <div key={msg.id}>
              <Message
                variant={msg.type} // "input" или "output"
                showReportButton={msg.showReportButton}
                onReport={() => handleReportMessage(msg)}
              >
                {msg.content}
              </Message>
              
              {/* Кнопка "Пожаловаться" только для ответов системы (output) */}
              {msg.type === "output" && msg.showReportButton && (
                <div style={{ 
                  marginLeft: "1rem", 
                  marginTop: "0.5rem",
                  textAlign: "left" // Выравниваем слева для ответов системы
                }}>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.6)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      padding: "0",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                    onClick={() => handleReportMessage(msg)}
                    title="Пожаловаться на сообщение"
                  >
                    <span style={{ 
                      color: "var(--secondary-red-1)", 
                      fontWeight: "bold" 
                    }}>
                      !
                    </span>
                    <span>Пожаловаться</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </MessagesContainer>
        
        {/* Поле ввода внизу */}
        <InputContainer>
          <Input
            placeholder="Спросите что-нибудь..."
            value={inputValue}
            onChange={handleInputChange}
            onSend={handleSendMessage}
          />
        </InputContainer>
      </MainContent>
    </LayoutContainer>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KnowledgeBasePage } from "./KnowledgeBasePage";

export function KnowledgeBasePageContainer() {
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState([
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 1 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 2 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 3 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 4 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 5 },
  ]);

  const [userInfo] = useState({
    username: "Петров Пётр Петрович"
  });

  const [chats] = useState([
    { id: 1, name: "Чат 1" },
    { id: 2, name: "Чат 2" },
  ]);

  const handleTabChange = (tab) => {
    if (tab === "chat") {
      navigate("/chat");
    } else if (tab === "queries") {
      alert("Страница журнала запросов еще не реализована");
    }
  };

  const handleNewChat = () => {
    console.log("Создание нового чата");
  };

  const handleChatSelect = (chat) => {
    console.log("Выбран чат:", chat);
  };

  const handleEditDocument = (document) => {
    console.log("Редактирование документа:", document);
    alert(`Редактирование документа: ${document.name}`);
  };

  const handleDeleteDocument = (document) => {
    console.log("Удаление документа:", document);
    
    if (window.confirm(`Вы уверены, что хотите удалить документ "${document.name}"?`)) {
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
    }
  };

  const handleAddDocument = () => {
    console.log("Добавление нового документа");
    alert("Функция добавления документа будет реализована позже");
    // Здесь позже будет логика добавления документа
  };

  return (
    <KnowledgeBasePage
      documents={documents}
      userInfo={userInfo}
      onTabChange={handleTabChange}
      chats={chats}
      onNewChat={handleNewChat}
      onChatSelect={handleChatSelect}
      onEditDocument={handleEditDocument}
      onDeleteDocument={handleDeleteDocument}
      onAddDocument={handleAddDocument}
    />
  );
}
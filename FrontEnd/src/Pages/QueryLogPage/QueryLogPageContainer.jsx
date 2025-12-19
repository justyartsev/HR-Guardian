import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QueryLogPage } from "./QueryLogPage";
import { DeleteDocumentModal } from "../../components/Modal/DeleteDocumentModal";

export function QueryLogPageContainer() {
  const navigate = useNavigate();
  
  const [complaints, setComplaints] = useState([
    { name: "Жалоба №124", date: "21.06.2025", user: "Петров Петр Петрович", id: 1 },
    { name: "Жалоба №124", date: "21.06.2025", user: "Петров Петр Петрович", id: 2 },
    { name: "Жалоба №124", date: "21.06.2025", user: "Петров Петр Петрович", id: 3 },
    { name: "Жалоба №124", date: "21.06.2025", user: "Петров Петр Петрович", id: 4 },
  ]);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [userInfo] = useState({
    username: "Петров Пётр Петрович"
  });

  const [chats, setChats] = useState(() => {
    const savedChats = localStorage.getItem('hrg_chats');
    if (savedChats) {
      return JSON.parse(savedChats);
    }
    return [
      { id: 1, name: "Чат 1", messages: [] },
      { id: 2, name: "Чат 2", messages: [] },
    ];
  });

  // Обработчик смены вкладок с навигацией
  const handleTabChange = (tab) => {
    if (tab === "chat") {
      navigate("/chat");
    } else if (tab === "knowledge") {
      navigate("/knowledge-base");
    }
  };

  // Обработчик открытия модалки удаления
  const handleDeleteComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setIsDeleteModalOpen(true);
  };

  // Обработчик подтверждения удаления
  const handleConfirmDelete = (complaint) => {
    console.log("Удаление жалобы:", complaint);
    
    setComplaints(prev => prev.filter(item => item.id !== complaint.id));
    alert(`Жалоба "${complaint.name}" удалена!`);
  };

  // Добавляем обработчики для работы с чатами
  const handleNewChat = () => {
    const generateChatId = () => Date.now();
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
    
    const newChatId = generateChatId();
    const newChatName = generateChatName(chats);
    
    const newChat = {
      id: newChatId,
      name: newChatName,
      messages: []
    };
    
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    localStorage.setItem('hrg_chats', JSON.stringify(updatedChats));
    
    console.log("Создан новый чат:", newChatName);
    
    // Переходим в чат
    navigate("/chat");
  };

  const handleChatSelect = (chat) => {
    console.log("Выбран чат:", chat);
    // Переходим в чат
    navigate("/chat");
  };

  const handleRenameChat = (chatId, newName) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, name: newName } : chat
    );
    setChats(updatedChats);
    localStorage.setItem('hrg_chats', JSON.stringify(updatedChats));
    console.log(`Чат ${chatId} переименован в:`, newName);
  };

  const handleDeleteChat = (chatId) => {
    if (chats.length <= 1) {
      alert("Нельзя удалить последний чат");
      return;
    }
    
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);
    localStorage.setItem('hrg_chats', JSON.stringify(updatedChats));
    console.log("Удален чат:", chatId);
  };

  return (
    <>
      <QueryLogPage
        complaints={complaints}
        userInfo={userInfo}
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onRenameChat={handleRenameChat} // Добавляем
        onDeleteChat={handleDeleteChat}
        onDeleteComplaint={handleDeleteComplaint}
      />

      {/* Модальное окно удаления жалобы */}
      <DeleteDocumentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        document={selectedComplaint}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
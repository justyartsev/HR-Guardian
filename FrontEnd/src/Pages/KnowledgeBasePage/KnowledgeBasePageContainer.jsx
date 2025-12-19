import { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import { KnowledgeBasePage } from "./KnowledgeBasePage";
import { EditDocumentModal } from "../../components/Modal/EditDocumentModal";
import { DeleteDocumentModal } from "../../components/Modal/DeleteDocumentModal";
import { AddDocumentModal } from "../../components/Modal/AddDocumentModal"; // Добавляем импорт

export function KnowledgeBasePageContainer() {
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState([
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 1 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 2 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 3 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 4 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 5 },
  ]);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Новое состояние для модалки добавления

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
  // Добавляем обработчики для работы с чатами (как в MainPageContainer)
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
  // Обработчик открытия модалки редактирования
  const handleEditDocument = (document) => {
    setSelectedDocument(document);
    setIsEditModalOpen(true);
  };

  // Обработчик открытия модалки удаления
  const handleDeleteDocument = (document) => {
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
  };

  // Обработчик открытия модалки добавления
  const handleAddDocument = () => {
    setIsAddModalOpen(true);
  };

  // Обработчик сохранения изменений документа
  const handleSaveDocument = (updatedDocument) => {
    console.log("Сохранение документа:", updatedDocument);
    
    setDocuments(prev => prev.map(doc => 
      doc.id === updatedDocument.id 
        ? { 
            ...doc, 
            ...updatedDocument
          } 
        : doc
    ));
    
    alert(`Документ "${updatedDocument.name}" обновлен!`);
  };

  // Обработчик добавления нового документа
  const handleAddNewDocument = (newDocument) => {
    console.log("Добавление нового документа:", newDocument);
    
    // Добавляем новый документ в начало списка
    setDocuments(prev => [newDocument, ...prev]);
    
    alert(`Документ "${newDocument.name}" успешно добавлен!`);
  };

  // Обработчик подтверждения удаления
  const handleConfirmDelete = (document) => {
    console.log("Удаление документа:", document);
    
    setDocuments(prev => prev.filter(doc => doc.id !== document.id));
    alert(`Документ "${document.name}" удален!`);
  };

  // Обработчик смены вкладок с навигацией
  const handleTabChange = (tab) => {
    if (tab === "chat") {
        navigate("/chat");
    } else if (tab === "queries") {
        navigate("/query-log"); // Изменяем на новый маршрут
    }
  };

  /*const handleNewChat = () => {
    console.log("Создание нового чата");
  };

  const handleChatSelect = (chat) => {
    console.log("Выбран чат:", chat);
  };*/

  return (
    <>
      <KnowledgeBasePage
        documents={documents}
        userInfo={userInfo}
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onRenameChat={handleRenameChat} // Добавляем
        onDeleteChat={handleDeleteChat}
        onEditDocument={handleEditDocument}
        onDeleteDocument={handleDeleteDocument}
        onAddDocument={handleAddDocument}
      />

      {/* Модальное окно редактирования документа */}
      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        document={selectedDocument}
        onSave={handleSaveDocument}
      />

      {/* Модальное окно удаления документа */}
      <DeleteDocumentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        document={selectedDocument}
        onConfirm={handleConfirmDelete}
      />

      {/* Модальное окно добавления документа */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddNewDocument}
      />
    </>
  );
}
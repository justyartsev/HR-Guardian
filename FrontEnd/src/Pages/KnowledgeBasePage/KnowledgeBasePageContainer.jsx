import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KnowledgeBasePage } from "./KnowledgeBasePage";
import { EditDocumentModal } from "../../components/Modal/EditDocumentModal";
import { DeleteDocumentModal } from "../../components/Modal/DeleteDocumentModal";
import { AddDocumentModal } from "../../components/Modal/AddDocumentModal";
import { dialogService } from "../../services/dialogService";
import { authService } from "../../services/authService";
//import { useUser } from "../../contexts/UserContext";

export function KnowledgeBasePageContainer() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    return authService.getCurrentUser();
  });

  // Состояния для документов
  const [documents, setDocuments] = useState([
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 1 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 2 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 3 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 4 },
    { name: "Регламент об отпускных днях", date: "21.06.2025", owner: "Петров Петр Петрович", id: 5 },
  ]);

  // Получаем текущего пользователя
  /*const [currentUser, setCurrentUser] = useState(() => {
    const user = authService.getCurrentUser();
    // Если нет пользователя в localStorage, используем данные из токена
    if (!user && authService.isAuthenticated()) {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          return {
            id: parseInt(payload.sub),
            username: payload.username || '',
            email: payload.email || '',
            firstName: payload.first_name || '',
            lastName: payload.last_name || '',
            role: payload.role || 'employee',
          };
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    }
    return user;
  });*/


  // Состояние для чатов
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  const userName = formatUserName(currentUser);




  // Загружаем данные при монтировании
  useEffect(() => {
    const loadData = async () => {
      if (!authService.isAuthenticated()) {
        navigate('/login');
        return;
      }
      
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        
        // Загружаем чаты
          try {
          const dialogs = await dialogService.getUserDialogs(user.id);
          if (dialogs && dialogs.length > 0) {
            const sortedDialogs = [...dialogs].sort((a, b) => 
              new Date(b.created_at) - new Date(a.created_at)
            );
            
            // Загружаем переименованные чаты из localStorage
            const storedChats = JSON.parse(localStorage.getItem('hrg_chats') || '[]');
            const storedChatsMap = new Map(storedChats.map(chat => [chat.id, chat]));
            
            const formattedChats = sortedDialogs.map(dialog => {
              const storedChat = storedChatsMap.get(dialog.id);
              return {
                id: dialog.id,
                name: storedChat?.name || dialog.title || `Чат ${dialog.id}`,
                messages: []
              };
            });
            
            setChats(formattedChats);
          }
        } catch (error) {
          console.error('Error loading dialogs:', error);
        }
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, [navigate]);

  // Создание нового чата
  const handleNewChat = async () => {
    if (!currentUser?.id) {
      navigate('/login');
      return;
    }

    try {
      // Генерируем имя для нового чата
      const chatName = `Чат ${chats.length + 1}`;
      
      const newDialog = await dialogService.createDialog(
        chatName,
        currentUser.id
      );
      
      const newChat = {
        id: newDialog.id,
        name: chatName,
        messages: [],
      };
      
      // Добавляем новый чат в начало списка
      const updatedChats = [newChat, ...chats];
      setChats(updatedChats);
      
      // Переходим в чат
      navigate('/chat');
      
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  // Выбор чата
  const handleChatSelect = (chat) => {
    console.log("Выбран чат:", chat);
    // Переходим в чат
    navigate('/chat');
  };

  // Переименование чата
  const handleRenameChat = (chatId, newName) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, name: newName } : chat
    );
    setChats(updatedChats);
    console.log(`Чат ${chatId} переименован в:`, newName);
  };

  // Удаление чата
  const handleDeleteChat = async (chatId) => {
    if (chats.length <= 1) {
      alert("Нельзя удалить последний чат");
      return;
    }
    
    try {
      await dialogService.deleteDialog(chatId);
      
      const updatedChats = chats.filter(chat => chat.id !== chatId);
      setChats(updatedChats);
      
      console.log("Удален чат:", chatId);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Обработчик смены вкладок с навигацией
  const handleTabChange = (tab) => {
    if (tab === "chat") {
      navigate("/chat");
    } else if (tab === "queries") {
      navigate("/query-log");
    }
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

  return (
    <>
      <KnowledgeBasePage
        documents={documents}
        userInfo={{
          username: userName,
          ...currentUser
        }}
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onEditDocument={handleEditDocument}
        onDeleteDocument={handleDeleteDocument}
        onAddDocument={handleAddDocument}
        isLoading={isLoading}
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
import styled from "styled-components"
import { Button } from "../Button/button"
import { useState, useEffect } from "react"
import { FiPlus, FiEdit2, FiLogOut, FiChevronLeft, FiChevronRight, FiMessageSquare, FiBook, FiAlertCircle, FiUsers } from "react-icons/fi";
import ContextMenu from "../ContextMenu/contextMenu";
import { ConfirmModal } from "../Modal/ConfirmModal";
import { useUser } from "../../contexts/UserContext";

const MainDiv = styled.div`
    display: flex;
    height: 100vh;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: space-between;
    min-width: ${props => props.$collapsed ? '60px' : '175px'};
    width: ${props => props.$collapsed ? '60px' : '20%'};
    max-width: ${props => props.$collapsed ? '60px' : '280px'};
    background: linear-gradient(180deg, var(--primary-black-1) 0%, #0c1015 100%);
    border-right: 1px solid var(--primasy-stroke-1);
    overflow: visible;
    transition: all 0.3s ease;
    position: relative;
    
    @media (max-width: 1200px) {
        width: ${props => props.$collapsed ? '60px' : '25%'};
    }
    
    @media (max-width: 768px) {
        width: ${props => props.$collapsed ? '60px' : '30%'};
        min-width: ${props => props.$collapsed ? '60px' : '150px'};
    }
    
    @media (max-width: 480px) {
        width: 100%;
        max-width: 100%;
        min-width: 100%;
        position: absolute;
        left: 0;
        top: 0;
        z-index: 999;
    }
`

const InnerDiv = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    width: 100%;
    justify-content: space-between;
    gap: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
`

const NameContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    border-bottom: 1px solid var(--primasy-stroke-1);
    width: 100%;
    flex-shrink: 0;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: var(--primary-black-2);
    }

    &:hover .edit-icon {
        opacity: 1;
    }
`

const NameText = styled.span`
    font-size: 1.4rem;
    color: var(--primary-white-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
`

const EditIcon = styled.span`
    opacity: 0;
    color: var(--secondary-orange-1);
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
`
const TopSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1rem;

    /* Скрываем полосу прокрутки */
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
        display: none;
    }
`

// Контейнер для кнопок чатов (без отдельной прокрутки)
const ChatsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`

// Используем div вместо Button чтобы избежать вложенности button > button
const ChatButton = styled.div`
  position: relative;
  height: 4rem;
  min-height: 4rem;
  display: flex;
  justify-content: ${props => props.$collapsed ? 'center' : 'space-between'};
  align-items: center;
  padding: ${props => props.$collapsed ? '0' : '0 1rem'};
  box-sizing: border-box;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 15px;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--primary-white-1);
  background-color: ${props => props.$isActive ? 'var(--secondary-orange-1)' : 'var(--primary-black-3)'};
  border: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.$isActive ? 'var(--secondary-orange-1)' : 'var(--primary-black-2)'};
  }
`;

const ChatName = styled.span`
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  border-radius: 50%;
  background-color: #e53935;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  margin-left: 0.8rem;
  box-shadow: 0 2px 4px rgba(229, 57, 53, 0.3);
`;

// Контейнер для нижних кнопок (фиксированный)
const BottomSection = styled.div`
    flex-shrink: 0; /* Фиксированная высота, не сжимается */
    display: flex;
    flex-direction: column;
    min-height: auto;
    padding: 0;
    gap: 0;
`;

const CollapseButton = styled.button`
    position: absolute;
    top: 50%;
    right: -14px;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary-black-2);
    border: 1px solid var(--primasy-stroke-1);
    color: var(--primary-white-1);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
    
    &:hover {
        background-color: var(--secondary-orange-1);
        border-color: var(--secondary-orange-1);
        transform: translateY(-50%) scale(1.1);
    }
`;

export default function SideMenu({
  active = "chat",
  onTabChange,
  chats = [],
  onNewChat,
  username = "Пользователь",
  firstName = "",
  lastName = "",
  position = "",
  department = "",
  onUpdateProfile,
  onChatSelect,
  onRenameChat,
  onDeleteChat,
  activeChatId,
  userRole = "employee",
  pendingUsersCount = 0,
  newFeedbackCount = 0
}) {
    const { clearUserData } = useUser();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [renameTargetId, setRenameTargetId] = useState(null);
    const [newChatName, setNewChatName] = useState("");
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editFirstName, setEditFirstName] = useState(firstName || "");
    const [editLastName, setEditLastName] = useState(lastName || "");
    const [editPosition, setEditPosition] = useState(position || "");
    const [editDepartment, setEditDepartment] = useState(department || "");

    // Обновляем состояние редактирования при изменении props
    useEffect(() => {
        setEditFirstName(firstName || "");
        setEditLastName(lastName || "");
        setEditPosition(position || "");
        setEditDepartment(department || "");
    }, [firstName, lastName, position, department]);

    const isHRorAdmin = userRole === 'hr' || userRole === 'admin';

    const handleLogout = () => {
        // Сначала очищаем React state
        clearUserData();

        // Явно удаляем ключи авторизации
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('hrg_chats');

        // Полная очистка на всякий случай
        localStorage.clear();
        sessionStorage.clear();

        // Небольшая задержка чтобы убедиться что очистка прошла
        setTimeout(() => {
            window.location.href = '/login';
        }, 50);
    };

    // Обработчик клика по вкладке
    const handleTabClick = (tabName) => {
        if (onTabChange) {
            onTabChange(tabName);
        }
    };
    const handleRenameChat = (chatId) => {
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            setRenameTargetId(chatId);
            setNewChatName(chat.name || chat.title || "");
            setIsRenameOpen(true);
        }
    };

    const handleConfirmRename = () => {
        if (onRenameChat && renameTargetId && newChatName.trim()) {
            onRenameChat(renameTargetId, newChatName.trim());
        }
        setIsRenameOpen(false);
        setRenameTargetId(null);
        setNewChatName("");
    };

    const handleDeleteChat = (chatId) => {
        setDeleteTargetId(chatId);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (onDeleteChat && deleteTargetId) {
            onDeleteChat(deleteTargetId);
            setDeleteTargetId(null);
        }
    };

    // Обработчики редактирования профиля
    const handleOpenEditProfile = () => {
        setEditFirstName(firstName);
        setEditLastName(lastName);
        setEditPosition(position);
        setEditDepartment(department);
        setIsEditProfileOpen(true);
    };

    const handleConfirmEditProfile = () => {
        if (onUpdateProfile) {
            onUpdateProfile({
                firstName: editFirstName.trim(),
                lastName: editLastName.trim(),
                position: editPosition.trim(),
                department: editDepartment.trim()
            });
        }
        setIsEditProfileOpen(false);
    };

    return <MainDiv id="SideMenu" $collapsed={isCollapsed}>
        <CollapseButton onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? "Развернуть" : "Свернуть"}>
            {isCollapsed ? <FiChevronRight size="1.2rem" /> : <FiChevronLeft size="1.2rem" />}
        </CollapseButton>
        <InnerDiv>
            <TopSection>
                    {!isCollapsed ? (
                        <Button 
                            style={{
                                height: '4rem', 
                                width: '100%', 
                                flexShrink: 0,
                                minHeight: '4rem'
                            }} 
                            onClick={onNewChat ? () => onNewChat() : () => newChat()}
                        >
                            <FiPlus size={"2rem"}/> Новый чат
                        </Button>
                    ) : (
                        <Button 
                            style={{
                                height: '4rem', 
                                width: '100%', 
                                flexShrink: 0,
                                minHeight: '4rem',
                                padding: 0
                            }} 
                            onClick={onNewChat ? () => onNewChat() : () => newChat()}
                            title="Новый чат"
                        >
                            <FiPlus size={"2rem"}/>
                        </Button>
                    )}
                    
                    {/* Генерация кнопок из chats */}
                    <ChatsContainer>
                        {chats.map((chat, index) => (
                            <ChatButton
                                key={chat.id}
                                onClick={() => onChatSelect && onChatSelect(chat.id)}
                                $isActive={activeChatId === chat.id}
                                $collapsed={isCollapsed}
                                title={isCollapsed ? (chat.name || chat.title) : undefined}
                            >
                                {isCollapsed ? (
                                    <FiMessageSquare size={18} />
                                ) : (
                                    <>
                                        <ChatName>{chat.name || chat.title}</ChatName>
                                        <ContextMenu
                                            id={chat.id}
                                            onRename={() => handleRenameChat(chat.id)}
                                            onDelete={() => handleDeleteChat(chat.id)}
                                        />
                                    </>
                                )}
                            </ChatButton>
                        ))}
                    </ChatsContainer>
                </TopSection>
                
                <BottomSection>
                    {!isCollapsed && (
                        <NameContainer onClick={handleOpenEditProfile} title="Редактировать профиль">
                            <NameText>{username}</NameText>
                            <EditIcon className="edit-icon">
                                <FiEdit2 size={14} />
                            </EditIcon>
                        </NameContainer>
                    )}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isCollapsed ? '0.5rem' : '1rem',
                        padding: isCollapsed ? '0.5rem' : '1rem'
                    }}>
                        <Button
                            name="chat"
                            onClick={() => handleTabClick("chat")}
                            variant={active === "chat" ? "alert" : ""}
                            style={{
                                height: '4rem',
                                width: '100%',
                                minHeight: '4rem',
                                padding: isCollapsed ? 0 : undefined
                            }}
                            title="Чат-бот"
                        >
                            {isCollapsed ? <FiMessageSquare size="1.8rem" /> : 'Чат-бот'}
                        </Button>
                        {/* Кнопки HR доступны только для hr и admin */}
                        {isHRorAdmin && (
                            <>
                                <Button
                                    name="knowledge"
                                    onClick={() => handleTabClick("knowledge")}
                                    variant={active === "knowledge" ? "alert" : ""}
                                    style={{
                                        height: '4rem',
                                        width: '100%',
                                        minHeight: '4rem',
                                        padding: isCollapsed ? 0 : undefined
                                    }}
                                    title="База знаний"
                                >
                                    {isCollapsed ? <FiBook size="1.8rem" /> : 'База знаний'}
                                </Button>
                                <Button
                                    name="queries"
                                    onClick={() => handleTabClick("queries")}
                                    variant={active === "queries" ? "alert" : ""}
                                    style={{
                                        height: '4rem',
                                        width: '100%',
                                        minHeight: '4rem',
                                        padding: isCollapsed ? 0 : undefined,
                                        position: 'relative'
                                    }}
                                    title="Журнал жалоб"
                                >
                                    {isCollapsed ? <FiAlertCircle size="1.8rem" /> : 'Журнал жалоб'}
                                    {newFeedbackCount > 0 && <Badge>{newFeedbackCount > 99 ? '99+' : newFeedbackCount}</Badge>}
                                </Button>
                                <Button
                                    name="users"
                                    onClick={() => handleTabClick("users")}
                                    variant={active === "users" ? "alert" : ""}
                                    style={{
                                        height: '4rem',
                                        width: '100%',
                                        minHeight: '4rem',
                                        padding: isCollapsed ? 0 : undefined,
                                        position: 'relative'
                                    }}
                                    title="Пользователи"
                                >
                                    {isCollapsed ? <FiUsers size="1.8rem" /> : 'Пользователи'}
                                    {pendingUsersCount > 0 && <Badge>{pendingUsersCount > 99 ? '99+' : pendingUsersCount}</Badge>}
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={handleLogout}
                            variant="danger"
                            style={{
                                height: '4rem',
                                width: '100%',
                                minHeight: '4rem',
                                marginTop: '0.5rem',
                                padding: isCollapsed ? 0 : undefined
                            }}
                            title="Выйти"
                        >
                            <FiLogOut size="1.6rem" style={{ marginRight: isCollapsed ? 0 : '0.5rem' }} />
                            {!isCollapsed && 'Выйти'}
                        </Button>
                    </div>
                </BottomSection>
            </InnerDiv>

        {/* Модальное окно удаления */}
        <ConfirmModal
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Удалить чат?"
            message="Вы уверены, что хотите удалить этот чат?"
            confirmText="Удалить"
            cancelText="Отмена"
            isDangerous={true}
        />

        {/* Модальное окно переименования */}
        <ConfirmModal
            isOpen={isRenameOpen}
            onClose={() => {
                setIsRenameOpen(false);
                setRenameTargetId(null);
                setNewChatName("");
            }}
            onConfirm={handleConfirmRename}
            title="Переименовать чат"
            message={
                <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Введите новое название"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1.4rem',
                        borderRadius: '8px',
                        border: '1px solid var(--primasy-stroke-1)',
                        backgroundColor: 'var(--primary-black-2)',
                        color: 'var(--primary-white-1)',
                        outline: 'none'
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleConfirmRename();
                        }
                    }}
                />
            }
            confirmText="Сохранить"
            cancelText="Отмена"
            isDangerous={false}
        />

        {/* Модальное окно редактирования профиля */}
        <ConfirmModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            onConfirm={handleConfirmEditProfile}
            title="Редактировать профиль"
            message={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', display: 'block' }}>
                            Имя
                        </label>
                        <input
                            type="text"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            placeholder="Введите имя"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.4rem',
                                borderRadius: '8px',
                                border: '1px solid var(--primasy-stroke-1)',
                                backgroundColor: 'var(--primary-black-2)',
                                color: 'var(--primary-white-1)',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', display: 'block' }}>
                            Фамилия
                        </label>
                        <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            placeholder="Введите фамилию"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.4rem',
                                borderRadius: '8px',
                                border: '1px solid var(--primasy-stroke-1)',
                                backgroundColor: 'var(--primary-black-2)',
                                color: 'var(--primary-white-1)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', display: 'block' }}>
                            Должность
                        </label>
                        <input
                            type="text"
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                            placeholder="Например: Менеджер по персоналу"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.4rem',
                                borderRadius: '8px',
                                border: '1px solid var(--primasy-stroke-1)',
                                backgroundColor: 'var(--primary-black-2)',
                                color: 'var(--primary-white-1)',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', display: 'block' }}>
                            Отдел
                        </label>
                        <input
                            type="text"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            placeholder="Например: HR-отдел"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.4rem',
                                borderRadius: '8px',
                                border: '1px solid var(--primasy-stroke-1)',
                                backgroundColor: 'var(--primary-black-2)',
                                color: 'var(--primary-white-1)',
                                outline: 'none'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleConfirmEditProfile();
                                }
                            }}
                        />
                    </div>
                </div>
            }
            confirmText="Сохранить"
            cancelText="Отмена"
            isDangerous={false}
        />
    </MainDiv>
}
import styled from "styled-components"
import { Button } from "../Button/button"
import { useEffect, useState } from "react"
import { FiPlus } from "react-icons/fi";
import ContextMenu from "../ContextMenu/contextMenu";

const MainDiv = styled.div`
    display: flex;
    height: 100vh;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: space-between;
    min-width: 175px;
    width: 20%;
    background-color: var(--primary-black-1);
    border: 1px solid var(--primasy-stroke-1);
    overflow: hidden;
`

const InnerDiv = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    width: auto;
    justify-content: flex-start;
    gap: 1rem;
    padding: 2rem 1rem;
    height: 100%;
    overflow: hidden;
`

const NameDiv = styled.div`
    font-size: 1.6rem;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 1.4rem 0;
    justify-content: space-around;
    color: var(--primary-white-1);
    border-bottom: 1px solid var(--primasy-stroke-1);
    border-top: 1px solid var(--primasy-stroke-1);
    width: auto;
    flex-shrink: 0;
`
const TopSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1; /* Занимает все доступное пространство */
    min-height: 0; /* Важно для работы flex вложенных элементов */
    overflow: hidden; /* Скрываем переполнение */
`
// Новый контейнер для кнопок чатов с прокруткой
const ChatsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1; /* Занимает все доступное пространство */
    overflow-y: auto; /* Добавляем вертикальную прокрутку */
    overflow-x: hidden; /* Скрываем горизонтальную прокроллку */
    
    /* Устанавливаем жесткое ограничение высоты */
    max-height: calc(100vh - 350px); /* Уменьшаем максимальную высоту */
    
    /* Стилизация скроллбара */
    &::-webkit-scrollbar {
        width: 6px;
    }
    
    &::-webkit-scrollbar-track {
        background: var(--primary-black-2);
        border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
        background: var(--primasy-stroke-1);
        border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
        background: var(--secondary-orange-1);
    }
    
    /* Для Firefox */
    scrollbar-width: thin;
    scrollbar-color: var(--primasy-stroke-1) var(--primary-black-2);
`

const ChatButton = styled(Button)`
  position: relative;
  height: 4rem;
  min-height: 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  width: 100%;
  flex-shrink: 0; 

  /* &:hover {
    background-color: var(--primary-black-2);
  }*/
`;

const ChatName = styled.span`
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Контейнер для нижних кнопок (фиксированный)
const BottomSection = styled.div`
    flex-shrink: 0; /* Фиксированная высота, не сжимается */
    display: flex;
    flex-direction: column;
    min-height: 180px; /* Минимальная высота для нижней секции */
`;


export default function SideMenu({ 
  active = "chat", 
  onTabChange, 
  chats = [], 
  onNewChat, 
  username = "...",
  onChatSelect,
  onRenameChat,
  onDeleteChat,
  activeChatId
}) {
    // placeHolder for newChat function
    async function newChat() {
        const response = await fetch();
        return response.ok;
    }

    // placeHolder for loadChats function
    //async function loadChats() {
    //    const response = await fetch();
    //    return response.ok;
    //}

    // placeholder to load chats on component render or dependency change (no deps now)
    useEffect(() => {
    
        console.log("SideMenu mounted");
    },[])

    // Обработчик клика по вкладке
    const handleTabClick = (tabName) => {
        if (onTabChange) {
            onTabChange(tabName);
        }
    };
    const handleRenameChat = (chatId) => {
        if (onRenameChat) {
            const chat = chats.find(c => c.id === chatId);
            if (chat) {
                const newName = prompt("Введите новое название чата:", chat.name);
                if (newName && newName.trim()) {
                    onRenameChat(chatId, newName.trim());
                }
            }
        }
    };

    const handleDeleteChat = (chatId) => {
        if (onDeleteChat) {
            if (window.confirm("Вы уверены, что хотите удалить этот чат?")) {
                onDeleteChat(chatId);
            }
        }
    };

    return <MainDiv id="SideMenu">
        <InnerDiv>
            <TopSection>
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
                    
                    {/* {Генерация кнопок из chats} */}
                    <ChatsContainer>
                        {chats.map((chat) => (
                            <ChatButton 
                                key={chat.id}
                                onClick={() => onChatSelect && onChatSelect(chat)}
                                variant={activeChatId === chat.id ? "alert" : ""}
                            >
                                <ChatName>{chat.name}</ChatName>
                                <ContextMenu 
                                    id={chat.id}
                                    onRename={() => handleRenameChat(chat.id)}
                                    onDelete={() => handleDeleteChat(chat.id)}
                                />
                            </ChatButton>
                        ))}
                    </ChatsContainer>
                </TopSection>
                
                <BottomSection>
                    <NameDiv>{username}</NameDiv>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        padding: '0 1rem 1rem 1rem'
                    }}>
                        <Button 
                            name="chat" 
                            onClick={() => handleTabClick("chat")} 
                            variant={active === "chat" ? "alert" : ""} 
                            style={{
                                height: '4rem', 
                                width: '100%',
                                minHeight: '4rem'
                            }}
                        >
                            Чат-бот
                        </Button>
                        <Button 
                            name="knowledge" 
                            onClick={() => handleTabClick("knowledge")} 
                            variant={active === "knowledge" ? "alert" : ""} 
                            style={{
                                height: '4rem', 
                                width: '100%',
                                minHeight: '4rem'
                            }}
                        >
                            База знаний
                        </Button>
                        <Button 
                            name="queries" 
                            onClick={() => handleTabClick("queries")} 
                            variant={active === "queries" ? "alert" : ""} 
                            style={{
                                height: '4rem', 
                                width: '100%',
                                minHeight: '4rem'
                            }}
                        >
                            Журнал запросов
                        </Button>
                    </div>
                </BottomSection>
            </InnerDiv>
        
        
    </MainDiv>
}
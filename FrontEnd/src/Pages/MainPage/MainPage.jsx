import styled from "styled-components";
import SideMenu from "../../components/SideMenu/sideMenu";
import { Message } from "../../components/Message/message";
import { Input } from "../../components/input/Input";
import { ChatWindow } from "../../components/ChatWindow/ChatWindow";

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  max-height: 100vh;
  background-color: var(--primary-black-2);
  color: var(--primary-white-1);
  width: 100vw;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem 3rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    135deg,
    var(--primary-black-1) 0%,
    var(--primary-black-3) 100%
  );
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
`;

const Title = styled.h1`
  font-size: 2.8rem;
  color: var(--primary-white-1);
  margin-bottom: 0.8rem;
  font-weight: 600;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--primasy-stroke-1);
  flex-shrink: 0;
`;

const InputContainer = styled.div`
  padding: 1rem 0 0 0;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
`;

const WelcomeInputContainer = styled.div`
  padding: 0.5rem 0 0 0;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  width: 100%;
`;

const ChatWindowWrapper = styled.div`
  flex: 1;
  min-height: 0;
  margin-bottom: 0;
  max-height: calc(100vh - 200px);
`;

// Контейнер для приветственного экрана
const WelcomeScreen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--primary-white-1);
  text-align: center;
  padding: 2rem;
  gap: 2rem;
  background: linear-gradient(
    135deg,
    var(--primary-black-1) 0%,
    var(--primary-black-3) 100%
  );
`;

const WelcomeTitle = styled.div`
  font-size: 2.4rem;
  font-weight: 600;
`;

const WelcomeText = styled.div`
  font-size: 1.6rem;
  color: rgba(255, 255, 255, 0.7);
  max-width: 600px;
  line-height: 1.5;
`;

// Контейнер для настроек чата (thinking toggle)
const ChatSettings = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  flex-shrink: 0;
`;

const ToggleContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--primary-white-1);
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

const ToggleSwitch = styled.div`
  width: 36px;
  height: 20px;
  background: ${props => props.$active ? 'var(--secondary-orange-1)' : 'rgba(255,255,255,0.2)'};
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
  
  &::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: ${props => props.$active ? '18px' : '2px'};
    transition: left 0.2s;
  }
`;

// Стили для редактирования сообщений
const EditableMessage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  min-height: 60px;
  padding: 0.8rem;
  font-size: 1.4rem;
  background: var(--primary-black-2);
  border: 1px solid var(--secondary-orange-1);
  border-radius: 8px;
  color: var(--primary-white-1);
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
  }
`;

const EditButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const EditButton = styled.button`
  padding: 0.4rem 0.8rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &.save {
    background: var(--secondary-orange-1);
    color: white;
    &:hover { opacity: 0.9; }
  }
  
  &.cancel {
    background: rgba(255,255,255,0.1);
    color: var(--primary-white-1);
    &:hover { background: rgba(255,255,255,0.2); }
  }
`;

const MessageEditIcon = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  padding: 0.2rem;
  margin-left: 0.5rem;
  opacity: 0;
  transition: all 0.2s;
  
  &:hover {
    color: var(--secondary-orange-1);
  }
`;

const MessageWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.8rem;
  max-width: 100%;
  
  &:hover ${MessageEditIcon} {
    opacity: 1;
  }
`;

export function MainPage({
  inputValue,
  messages,
  chats,
  currentUser,
  activeChatId,
  onLogout,
  isLoading,
  isLoadingMessages = false,
  userName,
  firstName,
  lastName,
  position,
  department,
  onInputChange,
  onSendMessage,
  onReportMessage,
  onNewChat,
  onChatSelect,
  onTabChange,
  onRenameChat,
  onDeleteChat,
  onUpdateProfile,
  onRetryMessage,
  pendingUsersCount = 0,
  newFeedbackCount = 0,
  // Новые props
  enableThinking = false,
  onToggleThinking,
  editingMessageId,
  editingContent,
  onEditingContentChange,
  onStartEditMessage,
  onCancelEdit,
  onSaveEdit
}) {
  // Показываем пустой чат только если сообщений нет и не в процессе загрузки
  // Приветственный экран показывается ВСЕГДА когда нет сообщений, даже если выбран чат
  const isEmptyChat = messages.length === 0 && !isLoadingMessages;
  
  return (
    <LayoutContainer>
      <SideMenu
        active="chat"
        onTabChange={onTabChange}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={onNewChat}
        username={userName}
        firstName={firstName}
        lastName={lastName}
        position={position}
        department={department}
        onUpdateProfile={onUpdateProfile}
        onChatSelect={onChatSelect}
        onRenameChat={onRenameChat}
        onDeleteChat={onDeleteChat}
        userRole={currentUser?.role}
        pendingUsersCount={pendingUsersCount}
        newFeedbackCount={newFeedbackCount}
      />
      
      <MainContent>
        <Title>HR-Guardian</Title>
        
        {!isEmptyChat ? (
          // Если есть сообщения - показываем нормальный интерфейс
          <>
            <ChatWindowWrapper>
              <ChatWindow messages={messages}>
                {messages.map((msg) => {
                  const isEditing = editingMessageId === msg.id;
                  const canEdit = msg.type === 'input' && !msg.isProcessing;
                  
                  return (
                    <MessageWrapper key={msg.id}>
                      <div style={{
                        flex: 1,
                        maxWidth: "100%",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}>
                        {isEditing ? (
                          <EditableMessage>
                            <EditTextarea
                              value={editingContent}
                              onChange={(e) => onEditingContentChange(e.target.value)}
                              autoFocus
                            />
                            <EditButtons>
                              <EditButton className="cancel" onClick={onCancelEdit}>
                                Отмена
                              </EditButton>
                              <EditButton className="save" onClick={() => onSaveEdit(msg.id)}>
                                Отправить
                              </EditButton>
                            </EditButtons>
                          </EditableMessage>
                        ) : (
                          <Message
                            variant={msg.type}
                            showReportButton={msg.showReportButton}
                            onReport={() => onReportMessage(msg)}
                            sources={msg.sources}
                            isError={msg.isError}
                            canRetry={msg.canRetry}
                            onRetry={msg.canRetry && onRetryMessage ? () => onRetryMessage(msg) : undefined}
                            isProcessing={msg.isProcessing}
                          >
                            {msg.content}
                          </Message>
                        )}
                      </div>
                      {canEdit && !isEditing && (
                        <MessageEditIcon onClick={() => onStartEditMessage(msg)} title="Редактировать">
                          ✏️
                        </MessageEditIcon>
                      )}
                    </MessageWrapper>
                  );
                })}
              </ChatWindow>
            </ChatWindowWrapper>
            <InputContainer>
              <ChatSettings>
                <ToggleContainer>
                  <ToggleSwitch $active={enableThinking} onClick={onToggleThinking} />
                  <span>Thinking</span>
                </ToggleContainer>
              </ChatSettings>
              <Input
                placeholder="Спросите что-нибудь..."
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onSend={onSendMessage}
              />
            </InputContainer>
          </>
        ) : (
          // Если чат пустой - показываем приветственный экран
          <WelcomeScreen>
            <WelcomeTitle>
              {currentUser?.firstName && currentUser?.lastName
                ? `Добро пожаловать, ${currentUser.lastName} ${currentUser.firstName}!`
                : currentUser?.lastName
                  ? `Добро пожаловать, ${currentUser.lastName}!`
                  : currentUser?.firstName
                    ? `Добро пожаловать, ${currentUser.firstName}!`
                    : 'Добро пожаловать в HR-Guardian!'
              }
            </WelcomeTitle>
            <WelcomeText>
              Начните новый диалог с AI-помощником. Задавайте вопросы о кадровой документации,
              трудовом законодательстве и процессах компании.
            </WelcomeText>
            <WelcomeInputContainer>
              <ChatSettings>
                <ToggleContainer>
                  <ToggleSwitch $active={enableThinking} onClick={onToggleThinking} />
                  <span>Thinking</span>
                </ToggleContainer>
              </ChatSettings>
              <Input
                placeholder="Спросите что-нибудь..."
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onSend={onSendMessage}
              />
            </WelcomeInputContainer>
          </WelcomeScreen>
        )}
      </MainContent>
    </LayoutContainer>
  );
}
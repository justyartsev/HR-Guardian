import styled from "styled-components";
import SideMenu from "../../components/SideMenu/sideMenu";
import { Message } from "../../components/Message/message";
import { Input } from "../../components/input/Input";
import { ChatWindow } from "../../components/ChatWindow/ChatWindow";
import { HeaderAuthButton } from '../../components/AuthButton/HeaderAuthButton';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--primary-black-2);
  color: var(--primary-white-1);
  width: 100vw; /* Добавляем */
  overflow-x: hidden; /* Добавляем */
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem 3rem 0 3rem;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    135deg,
    var(--primary-black-1) 0%,
    var(--primary-black-3) 100%
  );
  height: 100vh;
  max-height: 100vh;
  max-width: calc(100vw - 20%); /* Учитываем ширину SideMenu */
  overflow-x: hidden;
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
  padding: 0.5rem 0 1.2rem 0;
  background: linear-gradient(
    transparent,
    var(--primary-black-3) 30%
  );
  flex-shrink: 0;
  position: relative;
  z-index: 1;
`;

// НОВЫЙ компонент для Input в приветственном экране (без градиента)
const WelcomeInputContainer = styled.div`
  padding: 0.5rem 0 1.2rem 0;
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

// Удаляем Spacer - он не нужен
// const Spacer = styled.div`
//   height: 5rem;
//   flex-shrink: 0;
// `;

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

export function MainPage({ 
  inputValue,
  messages,
  chats,
  activeChatId,
  username,
  onInputChange,
  onSendMessage,
  onReportMessage,
  onNewChat,
  onChatSelect,
  onTabChange,
  onRenameChat,
  onDeleteChat
}) {
  const isEmptyChat = messages.length === 0;
  
  return (
    <LayoutContainer>
      <SideMenu 
        active="chat"
        onTabChange={onTabChange}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={onNewChat}
        username={username}
        onChatSelect={onChatSelect}
        onRenameChat={onRenameChat}    
        onDeleteChat={onDeleteChat} 
      />
      
      <MainContent>
        <Title>HR-Guardian</Title>
        <HeaderAuthButton /> {/* Добавляем кнопку авторизации */}
        
        {!isEmptyChat ? (
          // Если есть сообщения - показываем нормальный интерфейс
          <>
            <ChatWindowWrapper>
              <ChatWindow messages={messages}>
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    style={{ 
                      marginBottom: "0.8rem",
                      maxWidth: "100%",
                    }}
                  >
                    <div style={{
                      maxWidth: "100%",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      <Message
                        variant={msg.type}
                        showReportButton={msg.showReportButton}
                        onReport={() => onReportMessage(msg)}
                      >
                        <span style={{
                          maxWidth: "100%",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          display: "inline-block",
                        }}>
                          {msg.content}
                        </span>
                      </Message>
                    </div>
                    
                    {msg.type === "output" && msg.showReportButton && (
                      <div style={{ 
                        marginLeft: "1rem", 
                        marginTop: "0.3rem",
                        textAlign: "left"
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
                          onClick={() => onReportMessage(msg)}
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
              </ChatWindow>
            </ChatWindowWrapper>
            <InputContainer>
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
              Добро пожаловать в HR-Guardian!
            </WelcomeTitle>
            <WelcomeText>
              Начните новый диалог с AI-помощником. Задавайте вопросы о кадровой документации, 
              трудовом законодательстве и процессах компании.
            </WelcomeText>
            <WelcomeInputContainer>
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
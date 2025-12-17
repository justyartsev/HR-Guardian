// src/pages/MainPage/MainPage.jsx
import styled from "styled-components";
import SideMenu from "../../components/SideMenu/sideMenu";
import { Message } from "../../components/Message/message";
import { Input } from "../../components/input/Input";

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--primary-black-2);
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

export function MainPage({ 
  inputValue,
  messages,
  chats,
  username,
  onInputChange,
  onSendMessage,
  onReportMessage,
  onNewChat,
  onChatSelect,
  onTabChange
}) {
  return (
    <LayoutContainer>
      <SideMenu 
        active="chat"
        onTabChange={onTabChange}
        chats={chats}
        onNewChat={onNewChat}
        username={username}
        onChatSelect={onChatSelect}
      />
      
      <MainContent>
        <Title>HR-Guardian</Title>
        
        <MessagesContainer>
          {messages.map((msg) => (
            <div key={msg.id}>
              <Message
                variant={msg.type}
                showReportButton={msg.showReportButton}
                onReport={() => onReportMessage(msg)}
              >
                {msg.content}
              </Message>
              
              {msg.type === "output" && msg.showReportButton && (
                <div style={{ 
                  marginLeft: "1rem", 
                  marginTop: "0.5rem",
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
        </MessagesContainer>
        
        <InputContainer>
          <Input
            placeholder="Спросите что-нибудь..."
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onSend={onSendMessage}
          />
        </InputContainer>
      </MainContent>
    </LayoutContainer>
  );
}
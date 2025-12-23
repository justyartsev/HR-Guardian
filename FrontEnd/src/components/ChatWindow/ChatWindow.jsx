import styled from "styled-components";
import { useRef, useEffect } from "react";

const ChatContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MessagesScrollContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
  height: 100%;
  max-width: 100%; /* Ограничиваем максимальную ширину */
  
  /* Кастомный скроллбар */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const MessagesWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: min-content;
  padding-bottom: 0.5rem;
  max-width: 100%; /* Ограничиваем максимальную ширину */
`;

export function ChatWindow({ children, messages }) {
  const scrollRef = useRef(null);
  const lastMessageCount = useRef(messages.length);

  useEffect(() => {
    if (scrollRef.current && messages.length > lastMessageCount.current) {
      const scrollElement = scrollRef.current;
      setTimeout(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }, 10);
    }
    lastMessageCount.current = messages.length;
  }, [messages]);

  return (
    <ChatContainer>
      <MessagesScrollContainer ref={scrollRef}>
        <MessagesWrapper>
          {children}
        </MessagesWrapper>
      </MessagesScrollContainer>
    </ChatContainer>
  );
}
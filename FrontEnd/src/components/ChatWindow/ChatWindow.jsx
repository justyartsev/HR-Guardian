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
  max-width: 100%;

  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &:hover {
    scrollbar-color: rgba(219, 101, 75, 0.3) transparent;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
    transition: background 0.2s;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: rgba(219, 101, 75, 0.3);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(219, 101, 75, 0.5);
  }
`;

const MessagesWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: min-content;
  padding-bottom: 0.5rem;
  max-width: 100%;
`;

export function ChatWindow({ children, messages }) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const prevLastContentRef = useRef('');

  // Автопрокрутка при изменении сообщений
  useEffect(() => {
    if (!bottomRef.current) return;

    const lastMessage = messages[messages.length - 1];
    const lastContent = lastMessage?.content || '';
    const messagesLength = messages.length;

    // Скроллим вниз если:
    // 1. Добавилось новое сообщение
    // 2. Изменилось содержимое последнего сообщения (стриминг)
    // 3. Последнее сообщение в состоянии обработки
    const shouldScroll =
      messagesLength > prevMessagesLengthRef.current ||
      lastContent !== prevLastContentRef.current ||
      lastMessage?.isProcessing;

    if (shouldScroll) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    prevMessagesLengthRef.current = messagesLength;
    prevLastContentRef.current = lastContent;
  }, [messages]);

  // Мгновенный скролл при смене чата
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
    }
  }, [messages.length === 0]);

  return (
    <ChatContainer>
      <MessagesScrollContainer ref={scrollRef}>
        <MessagesWrapper>
          {children}
          <div ref={bottomRef} style={{ height: 1 }} />
        </MessagesWrapper>
      </MessagesScrollContainer>
    </ChatContainer>
  );
}
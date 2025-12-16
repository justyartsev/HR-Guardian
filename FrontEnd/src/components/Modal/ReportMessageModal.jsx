import styled from "styled-components";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "../Button/button";

const ModalButton = styled(Button)`
  background-color: transparent;
  border: 1px solid var(--primasy-stroke-1);
  color: var(--primary-white-1);

  &:hover {
    background-color: ${({ variant }) =>
      variant === "danger"
        ? "var(--secondary-red-1)"
        : "var(--secondary-orange-1)"};
  }

  &:active {
    background-color: ${({ variant }) =>
      variant === "danger"
        ? "var(--secondary-red-1)"
        : "var(--secondary-orange-1)"};
  }
`;

const MessageContent = styled.div`
  background-color: var(--primary-black-3);
  border-radius: 10px;
  padding: 1.2rem;
  margin-bottom: 1.6rem;
  border-left: 3px solid var(--secondary-orange-1);
`;

const MessageHeader = styled.div`
  font-size: 1.4rem;
  color: var(--secondary-orange-1);
  font-weight: 600;
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const MessageIcon = styled.span`
  font-size: 1.6rem;
`;

const MessageText = styled.p`
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin-bottom: 0.8rem;
`;

const CommentSection = styled.div`
  margin-bottom: 1.6rem;
`;

const CommentLabel = styled.div`
  font-size: 1.4rem;
  color: var(--primary-white-1);
  font-weight: 600;
  margin-bottom: 0.8rem;
  font-style: italic;
`;

const CommentTextarea = styled.textarea`
  width: 90%; /* Уменьшил ширину с 100% до 90% */
  margin: 0 auto; /* Центрируем */
  display: block; /* Чтобы сработал margin auto */
  min-height: 80px; /* Уменьшил высоту */
  padding: 0.8rem;
  background-color: var(--primary-black-3);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  color: var(--primary-white-1);
  font-size: 1.3rem;
  font-family: inherit;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-top: 1.6rem;
`;

export function ReportMessageModal({ 
  isOpen, 
  onClose, 
  message,
  onReport 
}) {
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    // Убрали проверку чекбокса
    onReport({
      messageId: message?.id,
      messageContent: message?.content,
      comment: comment.trim(),
      timestamp: new Date().toISOString()
    });
    handleClose();
  };

  const handleClose = () => {
    setComment("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <MessageHeader>
        <MessageIcon>⚠️</MessageIcon>
        Жалоба на сообщение:
      </MessageHeader>
      
      <MessageContent>
        <MessageText>{message?.content}</MessageText>
      </MessageContent>
      
      <CommentSection>
        <CommentLabel>Комментарий к жалобе:</CommentLabel>
        <CommentTextarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Введите комментарий..."
          maxLength={300}
        />
        <div style={{
          fontSize: "1.1rem",
          color: "rgba(255, 255, 255, 0.5)",
          textAlign: "right",
          marginTop: "0.4rem",
          width: "90%",
          margin: "0.4rem auto 0 auto"
        }}>
          {comment.length}/300 символов
        </div>
      </CommentSection>
      
      
      
      <ModalActions>
        <ModalButton variant="alert" onClick={handleClose}>
          Отмена
        </ModalButton>
        <ModalButton 
          variant="danger" 
          onClick={handleSubmit}
        >
          Пожаловаться
        </ModalButton>
      </ModalActions>
    </Modal>
  );
}
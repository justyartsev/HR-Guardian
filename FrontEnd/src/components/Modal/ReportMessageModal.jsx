import styled from "styled-components";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "../Button/button";

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

const MessageLink = styled.a`
  color: var(--secondary-orange-1);
  text-decoration: underline;
  font-size: 1.3rem;
  cursor: pointer;
  
  &:hover {
    color: #ff8c66;
  }
`;

const CommentSection = styled.div`
  margin-bottom: 2rem;
`;

const CommentLabel = styled.div`
  font-size: 1.4rem;
  color: var(--primary-white-1);
  font-weight: 600;
  margin-bottom: 0.8rem;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const CommentIcon = styled.span`
  font-size: 1.6rem;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  background-color: var(--primary-black-3);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  color: var(--primary-white-1);
  font-size: 1.4rem;
  font-family: inherit;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
    box-shadow: 0 0 0 2px rgba(219, 101, 75, 0.2);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.6rem;
  cursor: pointer;
  user-select: none;
`;

const CheckboxInput = styled.input`
  width: 1.8rem;
  height: 1.8rem;
  cursor: pointer;
  accent-color: var(--secondary-orange-1);
`;

const CheckboxLabel = styled.label`
  font-size: 1.4rem;
  color: var(--primary-white-1);
  cursor: pointer;
  font-weight: 500;
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
  const [agreeToReport, setAgreeToReport] = useState(false);

  const handleSubmit = () => {
    if (!agreeToReport) {
      alert("Пожалуйста, подтвердите отправку жалобы");
      return;
    }
    
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
    setAgreeToReport(false);
    onClose();
  };

  const messageContent = message?.content || "Дата вашей следующей аттестации - 20.10.2025. Если вы хотите посмотреть соответствующий документ, то вот он.";
  const documentLink = message?.documentLink || "https://example.com/document.pdf";

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <MessageHeader>
        <MessageIcon>⚠️</MessageIcon>
        Жалоба на сообщение:
      </MessageHeader>
      
      <MessageContent>
        <MessageText>{messageContent}</MessageText>
        <MessageLink href={documentLink} target="_blank" rel="noopener noreferrer">
          "Ссылка на документ"
        </MessageLink>
      </MessageContent>
      
      <CommentSection>
        <CommentLabel>
          <CommentIcon>💬</CommentIcon>
          Комментарий к жалобе:
        </CommentLabel>
        <CommentTextarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Введите комментарий..."
          maxLength={500}
        />
        <div style={{
          fontSize: "1.2rem",
          color: "rgba(255, 255, 255, 0.5)",
          textAlign: "right",
          marginTop: "0.4rem"
        }}>
          {comment.length}/500 символов
        </div>
      </CommentSection>
      
      <CheckboxContainer onClick={() => setAgreeToReport(!agreeToReport)}>
        <CheckboxInput
          type="checkbox"
          checked={agreeToReport}
          onChange={() => setAgreeToReport(!agreeToReport)}
          id="report-confirm"
        />
        <CheckboxLabel htmlFor="report-confirm">
          Подтверждаю отправку жалобы
        </CheckboxLabel>
      </CheckboxContainer>
      
      <ModalActions>
        <Button variant="danger" onClick={handleClose}>
          Отмена
        </Button>
        <Button 
          variant="alert" 
          onClick={handleSubmit}
          disabled={!agreeToReport}
          style={{
            opacity: agreeToReport ? 1 : 0.6,
            cursor: agreeToReport ? "pointer" : "not-allowed"
          }}
        >
          Пожаловаться
        </Button>
      </ModalActions>
    </Modal>
  );
}
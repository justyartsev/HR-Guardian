import { Modal } from "./Modal";
import { Button } from "../Button/button";
import styled from "styled-components";

const Highlight = styled.span`
  color: var(--secondary-orange-1);
  font-weight: 600;
`;

const WarningIcon = styled.div`
  font-size: 3rem;
  color: var(--secondary-red-1);
  margin-bottom: 1.6rem;
  text-align: center;
`;

const WarningText = styled.p`
  font-size: 1.5rem;
  margin-bottom: 2.4rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
`;

export function DeleteDocumentModal({ 
  isOpen, 
  onClose, 
  document, 
  onConfirm 
}) {
  const handleConfirm = () => {
    onConfirm(document);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <WarningIcon>⚠️</WarningIcon>
      <h2 style={{ 
        fontSize: "2rem",
        marginBottom: "1.6rem",
        color: "var(--primary-white-1)",
        fontWeight: "600",
        textAlign: "center"
      }}>
        Удаление документа
      </h2>
      
      <WarningText>
        Вы действительно хотите удалить документ<br />
        <Highlight>"{document?.name}"</Highlight>?
      </WarningText>
      
      <p style={{ 
        fontSize: "1.4rem", 
        marginBottom: "2.4rem", 
        lineHeight: "1.5",
        color: "rgba(255, 255, 255, 0.6)",
        textAlign: "center"
      }}>
        Это действие нельзя отменить. Документ будет удален безвозвратно.
      </p>
      
      <div style={{ 
        display: "flex", 
        gap: "1.6rem", 
        justifyContent: "center"
      }}>
        <Button variant="danger" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="alert" onClick={handleConfirm}>
          Удалить
        </Button>
      </div>
    </Modal>
  );
}
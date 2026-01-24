import styled from "styled-components";
import { Modal } from "./Modal";
import { Button } from "../Button/button";

const ButtonGroup = styled.div`
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-top: 2rem;
`;

const ConfirmButton = styled(Button)`
  background-color: var(--secondary-orange-1);
  border: 1px solid var(--secondary-orange-1);
  color: var(--primary-white-1);
  flex: 1;
  min-width: 120px;

  &:hover {
    background-color: #ff6b35;
    border-color: #ff6b35;
  }

  &:active {
    background-color: #ff5722;
    border-color: #ff5722;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  border: 1px solid var(--primasy-stroke-1);
  color: var(--primary-white-1);
  flex: 1;
  min-width: 120px;

  &:hover {
    background-color: var(--primary-black-2);
  }

  &:active {
    background-color: var(--primary-black-3);
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.6rem;
  color: var(--primary-white-1);
  font-weight: 600;
  text-align: center;
`;

const Message = styled.div`
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  line-height: 1.6;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  /* Центрируем вложенные input'ы */
  input {
    width: 80%;
    box-sizing: border-box;
  }

  /* Центрируем вложенные div'ы с input'ами */
  > div {
    width: 80%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;

    input {
      width: 100%;
    }
  }
`;

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Подтверждение",
  message = "Вы уверены?",
  confirmText = "Удалить",
  cancelText = "Отмена",
  isDangerous = false,
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Title>{title}</Title>
      <Message>{message}</Message>
      <ButtonGroup>
        <CancelButton onClick={onClose}>{cancelText}</CancelButton>
        <ConfirmButton 
          onClick={handleConfirm}
          style={{ 
            backgroundColor: isDangerous ? '#ff5722' : 'var(--secondary-orange-1)'
          }}
        >
          {confirmText}
        </ConfirmButton>
      </ButtonGroup>
    </Modal>
  );
}

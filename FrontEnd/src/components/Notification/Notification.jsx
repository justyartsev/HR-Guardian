import styled from "styled-components";

const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: ${props => {
    switch(props.$type) {
      case 'success': return 'var(--secondary-green-1, #4caf50)';
      case 'error': return 'var(--secondary-red-1)';
      case 'warning': return 'var(--secondary-orange-1)';
      default: return '#2196F3';
    }
  }};
  color: white;
  padding: 1.2rem 1.6rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 2000;
  max-width: 400px;
  word-wrap: break-word;
  animation: slideIn 0.3s ease-in-out;

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  &.closing {
    animation: slideOut 0.3s ease-in-out forwards;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.4rem;
  padding: 0;
  margin-left: 1rem;
  opacity: 0.8;
  
  &:hover {
    opacity: 1;
  }
`;

export function Notification({ message, type = 'info', onClose }) {
  return (
    <NotificationContainer $type={type}>
      <span>{message}</span>
      <CloseButton onClick={onClose}>×</CloseButton>
    </NotificationContainer>
  );
}

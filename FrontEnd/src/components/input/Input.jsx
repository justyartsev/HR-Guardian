import styled from "styled-components";
import { FiSend } from "react-icons/fi";

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;

  background-color: var(--primary-black-2);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 12px;
  transition: all 200ms ease;

  &:focus-within {
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
`;

const StyledTextarea = styled.textarea`
  flex: 1;
  padding: 14px 16px;
  font-size: 1.5rem;
  line-height: 1.5;

  border: none;
  background: transparent;
  color: var(--primary-white-1);

  resize: none;
  overflow-y: auto;

  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  &:focus {
    outline: none;
  }
  
  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SendButton = styled.button`
  width: 52px;
  border: none;
  background: transparent;

  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--primary-white-1);
  cursor: pointer;

  transition: all 200ms ease;

  &:hover:not(:disabled) {
    color: var(--secondary-orange-1);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

export function Input({ value, onChange, onSend, ...params }) {
  const isDisabled = !value.trim();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) {
        onSend();
      }
    }
  };

  return (
    <Wrapper>
      <StyledTextarea
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        rows={1}
        {...params}
      />
      <SendButton onClick={onSend} disabled={isDisabled}>
        <FiSend size={20} />
      </SendButton>
    </Wrapper>
  );
}

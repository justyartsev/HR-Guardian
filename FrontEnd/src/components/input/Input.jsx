import styled from "styled-components";
import { FiSend } from "react-icons/fi";

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;

  background-color: var(--primary-black-3);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 10px;
  transition: border 300ms ease;

  &:hover {
    border-color: rgba(219, 101, 75, 0.7);
  }

  &:focus-within {
    border-color: var(--secondary-orange-1);
    box-shadow: 0 0 0 2px rgba(219, 101, 75, 0.2);
  }
`;

const StyledTextarea = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  font-size: 1.6rem;
  line-height: 1.4;

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

  transition: color 200ms ease, opacity 200ms ease;

  &:hover:not(:disabled) {
    color: var(--secondary-orange-1);
  }

  &:disabled {
    opacity: 0.4;
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

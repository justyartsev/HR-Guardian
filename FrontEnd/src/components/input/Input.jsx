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

  /* ⬇️ СКРЫВАЕМ SCROLLBAR */
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &:focus {
    outline: none;
  }
`;


const SendButton = styled.button`
  width: 52px;              /* ⬅️ реальная зона кнопки */
  border: none;
  background: transparent;

  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--primary-white-1);
  cursor: pointer;

  transition: color 200ms ease;

  &:hover {
    color: var(--secondary-orange-1);
  }
`;

export function Input({ value, onChange, onSend, ...params }) {
  return (
    <Wrapper>
      <StyledTextarea
        value={value}
        onChange={onChange}
        rows={1}
        {...params}
      />
      <SendButton onClick={onSend}>
        <FiSend size={20} />
      </SendButton>
    </Wrapper>
  );
}

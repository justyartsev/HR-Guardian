import styled from "styled-components";

const StyledInput = styled.input`
  padding: 12px 16px;
  font-size: 1.6rem;
  border-radius: 10px;
  border: 1px solid var(--primasy-stroke-1);
  background-color: var(--primary-black-3);
  color: var(--primary-white-1);
  transition: all 300ms ease-out;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
    box-shadow: 0 0 0 2px rgba(219, 101, 75, 0.2);
  }
  
  &:hover {
    border-color: rgba(219, 101, 75, 0.7); /* Полупрозрачный оранжевый */
  }
`;

export function Input({ ...params }) {
  return <StyledInput {...params} />
}
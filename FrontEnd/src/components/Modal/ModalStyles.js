/**
 * Общие стили для модальных окон
 * Устраняет дублирование ModalButton в 6+ файлах
 */
import styled from "styled-components";
import { Button } from "../Button/button";

/**
 * Кнопка для модальных окон с поддержкой вариантов:
 * - default (alert): оранжевый hover
 * - danger: красный hover
 */
export const ModalButton = styled(Button)`
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

/**
 * Группа кнопок в модальном окне
 */
export const ButtonGroup = styled.div`
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-top: 2rem;
`;

/**
 * Заголовок модального окна
 */
export const ModalTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.6rem;
  color: var(--primary-white-1);
  font-weight: 600;
  text-align: center;
`;

/**
 * Группа полей ввода
 */
export const InputGroup = styled.div`
  margin-bottom: 1.6rem;
  width: 80%;
  margin-left: auto;
  margin-right: auto;
`;

/**
 * Метка поля ввода
 */
export const InputLabel = styled.label`
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.6rem;
  color: var(--primary-white-1);
`;

/**
 * Поле ввода в модальном окне
 */
export const ModalInput = styled.input`
  width: 100%;
  padding: 1rem 1.2rem;
  font-size: 1.4rem;
  background-color: var(--primary-black-2);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  color: var(--primary-white-1);

  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

/**
 * Textarea в модальном окне
 */
export const ModalTextarea = styled.textarea`
  width: 100%;
  padding: 1rem 1.2rem;
  font-size: 1.4rem;
  background-color: var(--primary-black-2);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  color: var(--primary-white-1);
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

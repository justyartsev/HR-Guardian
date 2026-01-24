import { useEffect, useRef } from "react";
import styled from "styled-components";
import { Modal } from "./Modal";
import { ModalButton } from "./ModalStyles";
import { Button } from "../Button/button";
const MessageIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const MessageHeader = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.6rem;
  color: var(--primary-white-1);
  font-weight: 600;
  text-align: center;
`;

const Section = styled.div`
  margin-bottom: 1.6rem;
  padding-bottom: 1.6rem;
  border-bottom: 1px solid var(--primasy-stroke-1);

  &:last-child {
    border-bottom: none;
  }
`;

const SectionLabel = styled.label`
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--secondary-orange-1);
  margin-bottom: 0.6rem;
`;

const SectionContent = styled.div`
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-top: 2rem;
`;

const ResolveButton = styled(Button)`
  background-color: rgba(0, 200, 100, 0.2);
  border: 1px solid #00c864;
  color: #00c864;

  &:hover {
    background-color: rgba(0, 200, 100, 0.3);
  }

  &:active {
    background-color: rgba(0, 200, 100, 0.4);
  }
`;

// Безопасное преобразование значения в строку
const safeString = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toLocaleDateString('ru-RU');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export function ViewFeedbackModal({
  isOpen,
  onClose,
  feedback,
  onStatusChange
}) {
  // Отслеживаем уже обработанные feedback чтобы избежать бесконечного цикла
  const processedFeedbackRef = useRef(null);

  // Автоматически меняем статус на 'acknowledged' при открытии ОДИН РАЗ
  useEffect(() => {
    if (isOpen && feedback && feedback.status === 'new' && onStatusChange) {
      // Проверяем, не обрабатывали ли мы уже этот feedback
      if (processedFeedbackRef.current !== feedback.id) {
        processedFeedbackRef.current = feedback.id;
        onStatusChange(feedback.id, 'acknowledged');
      }
    }

    // Сбрасываем при закрытии
    if (!isOpen) {
      processedFeedbackRef.current = null;
    }
  }, [isOpen, feedback?.id, feedback?.status, onStatusChange]);

  if (!feedback) {
    return null;
  }

  // Форматируем статус
  const getStatusDisplay = (status) => {
    if (status === 'new') return 'Новая';
    if (status === 'acknowledged') return 'Просмотрена';
    if (status === 'resolved') return 'Решена';
    return safeString(status);
  };

  // Обработчик кнопки "Решено"
  const handleResolve = () => {
    if (onStatusChange) {
      onStatusChange(feedback.id, 'resolved');
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <MessageHeader>Подробности жалобы</MessageHeader>

      <Section>
        <SectionLabel>Статус:</SectionLabel>
        <SectionContent>{getStatusDisplay(feedback.status)}</SectionContent>
      </Section>

      <Section>
        <SectionLabel>Дата создания:</SectionLabel>
        <SectionContent>{safeString(feedback.date)}</SectionContent>
      </Section>

      <Section>
        <SectionLabel>Пользователь:</SectionLabel>
        <SectionContent>{safeString(feedback.user)}</SectionContent>
      </Section>

      {feedback.question && (
        <Section>
          <SectionLabel>Вопрос пользователя:</SectionLabel>
          <SectionContent>{safeString(feedback.question)}</SectionContent>
        </Section>
      )}

      {feedback.response && (
        <Section>
          <SectionLabel>Ответ системы:</SectionLabel>
          <SectionContent>{safeString(feedback.response)}</SectionContent>
        </Section>
      )}

      {feedback.comment && (
        <Section>
          <SectionLabel>Комментарий:</SectionLabel>
          <SectionContent>{safeString(feedback.comment)}</SectionContent>
        </Section>
      )}

      {feedback.rating && (
        <Section>
          <SectionLabel>Оценка:</SectionLabel>
          <SectionContent>{safeString(feedback.rating)}/5</SectionContent>
        </Section>
      )}

      <ButtonGroup>
        {feedback.status !== 'resolved' && (
          <ResolveButton onClick={handleResolve}>
            Отметить решённой
          </ResolveButton>
        )}
        <ModalButton onClick={onClose}>Закрыть</ModalButton>
      </ButtonGroup>
    </Modal>
  );
}

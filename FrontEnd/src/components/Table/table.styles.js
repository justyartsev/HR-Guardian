import styled from "styled-components";

/* Внешний wrapper для обеспечения прокрутки */
export const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto; /* Горизонтальная прокрутка */
    overflow-y: visible;
    border-radius: 16px;
    background-color: var(--primary-black-3);

    /* Стилизация скроллбара для лучшей видимости */
    &::-webkit-scrollbar {
        height: 12px;
    }

    &::-webkit-scrollbar-track {
        background: var(--primary-black-2);
        border-radius: 6px;
        margin: 0 10px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        border: 2px solid var(--primary-black-2);

        &:hover {
            background: var(--secondary-orange-1);
        }

        &:active {
            background: var(--secondary-orange-1);
        }
    }
`;

export const StyledTable = styled.table`
    width: 100%;
    min-width: 800px; /* Минимальная ширина для корректного отображения всех колонок */
    color: var(--primary-white-1);
    font-size: 1.4rem;
    border-collapse: collapse;
    background-color: var(--primary-black-3);

    @media (max-width: 768px) {
        min-width: 600px; /* Уменьшаем минимальную ширину на мобильных */
        font-size: 1.3rem;
    }
`;

export const Thead = styled.thead`
    background-color: var(--primary-black-1);
`;

export const Th = styled.th`
    text-align: left;
    padding: 1.6rem;
    font-weight: 500;
    border-bottom: 1px solid var(--primasy-stroke-1);
    white-space: nowrap;
    background-color: var(--primary-black-1);

    @media (max-width: 768px) {
        padding: 1.2rem;
        font-size: 1.2rem;
    }
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
    background-color: var(--primary-black-2);
    transition: background-color 200ms ease;

    &:hover {
        background-color: var(--primary-black-1);
    }
`;

export const Td = styled.td`
    padding: 1.6rem;
    border-bottom: 1px solid var(--primasy-stroke-1);

    /* Первая колонка (название) может переноситься */
    &:first-child {
        max-width: 300px;
        white-space: normal;
        word-wrap: break-word;
    }

    /* Остальные колонки не переносятся */
    &:not(:first-child) {
        white-space: nowrap;
    }

    /* Колонка с действиями - минимальная фиксированная ширина */
    &:last-child {
        width: 140px;
        min-width: 140px;
    }

    @media (max-width: 768px) {
        padding: 1.2rem;

        &:first-child {
            max-width: 200px;
        }
    }
`;

export const Actions = styled.div`
    display: flex;
    gap: 1.2rem;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: nowrap; /* Не переносим кнопки на новую строку */

    @media (max-width: 768px) {
        gap: 0.8rem;
    }
`;

export const IconButton = styled.button`
    background: none;
    border: none;
    color: var(--primary-white-1);
    font-size: 1.8rem;
    cursor: pointer;
    transition: color 200ms ease;
    padding: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.4rem; /* Минимальная ширина для касания на мобильных */
    min-height: 2.4rem;

    &:hover {
        color: var(--secondary-orange-1);
    }

    &.warning:hover {
        color: #ffc107;
    }

    &.danger:hover {
        color: var(--secondary-red-1);
    }

    @media (max-width: 768px) {
        font-size: 1.6rem;
        min-width: 3.2rem; /* Больше для удобства на мобильных */
        min-height: 3.2rem;
    }
`;

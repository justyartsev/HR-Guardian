import styled from "styled-components";

export const TableWrapper = styled.div`
    width: 100%;
    background-color: var(--primary-black-3);
    border-radius: 16px;
    overflow: hidden;
`;

export const StyledTable = styled.table`
    width: 100%;
    color: var(--primary-white-1);
    font-size: 1.4rem;
`;

export const Thead = styled.thead`
    background-color: var(--primary-black-1);
`;

export const Th = styled.th`
    text-align: left;
    padding: 1.6rem;
    font-weight: 500;
    border-bottom: 1px solid var(--primasy-stroke-1);
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
    background-color: var(--primary-black-2)
    transition: background-color 200ms ease;

    &:hover {
        background-color: var(--primary-black-1);
    }
`;

export const Td = styled.td`
    padding: 1.6rem;
    border-bottom: 1px solid var(--primasy-stroke-1);
`;

export const Actions = styled.div`
    display: flex;
    gap: 1.2rem;
`;

export const IconButton = styled.button`
    background: none;
    border: none;
    color: var(--primary-white-1);
    font-size: 1.8rem;
    cursor: pointer;
    transition: color 200ms ease;

    &:hover {
        color: var(--secondary-orange-1);
    }

    &.danger:hover {
        color: var(--secondary-red-1);
    }
`;
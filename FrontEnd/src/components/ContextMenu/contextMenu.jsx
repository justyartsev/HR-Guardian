// components/ContextMenu/contextMenu.jsx
import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { FiEdit, FiTrash2, FiMoreVertical } from "react-icons/fi";

const MenuButton = styled.button`
  background: none;
  border: none;
  color: var(--primary-white-1);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--secondary-orange-1);
  }
`;

const MenuContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const MenuDropdown = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  background-color: var(--primary-black-2);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  min-width: 150px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  padding: 1rem 1.2rem;
  background: none;
  border: none;
  color: var(--primary-white-1);
  cursor: pointer;
  font-size: 1.4rem;
  text-align: left;
  
  &:hover {
    background-color: var(--primary-black-3);
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--primasy-stroke-1);
  }
  
  &.danger:hover {
    color: var(--secondary-red-1);
  }
`;

export default function ContextMenu({ id, onRename, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleRename = (e) => {
    e.stopPropagation();
    if (onRename) onRename();
    setIsOpen(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete();
    setIsOpen(false);
  };

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <MenuContainer ref={menuRef}>
      <MenuButton onClick={toggleMenu}>
        <FiMoreVertical size={18} />
      </MenuButton>
      
      {isOpen && (
        <MenuDropdown>
          <MenuItem onClick={handleRename}>
            <FiEdit size={16} />
            Переименовать
          </MenuItem>
          <MenuItem onClick={handleDelete} className="danger">
            <FiTrash2 size={16} />
            Удалить
          </MenuItem>
        </MenuDropdown>
      )}
    </MenuContainer>
  );
}
import styled from "styled-components";
import { createPortal } from "react-dom";
import { useEffect } from "react";

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: var(--primary-black-2);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: ${props => props.$size === "large" ? "500px" : "420px"};
  min-width: ${props => props.$size === "large" ? "450px" : "380px"};
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid var(--primasy-stroke-1);
  color: var(--primary-white-1);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
`;

export function Modal({ isOpen, onClose, children, title, size = "medium" }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <Overlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()} $size={size}>
        {title && <h2 style={{
          fontSize: "1.8rem",
          marginBottom: "1rem",
          color: "var(--primary-white-1)",
          fontWeight: "600",
          textAlign: "center"
        }}>{title}</h2>}
        {children}
      </ModalContent>
    </Overlay>,
    document.body
  );
}
import styled from "styled-components";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "../Button/button";

const ModalButton = styled(Button)`
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

const InputGroup = styled.div`
  margin-bottom: 1.6rem;
  width: 80%;
  margin-left: auto;
  margin-right: auto;
`;

const Label = styled.label`
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.6rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem 1.2rem;
  background-color: var(--primary-black-3);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  color: var(--primary-white-1);
  font-size: 1.4rem;
  
  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
    box-shadow: 0 0 0 2px rgba(219, 101, 75, 0.2);
  }
`;

const FileInput = styled.div`
  margin-bottom: 1.6rem;
  width: 80%;
  margin-left: auto;
  margin-right: auto;
`;

const FileButton = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-black-3);
  border: 2px dashed var(--primasy-stroke-1);
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
  cursor: pointer;
  transition: all 200ms ease;
  min-height: 80px;
  
  &:hover {
    border-color: var(--secondary-orange-1);
    background-color: rgba(35, 38, 48, 0.8);
  }
`;

const FileInputText = styled.span`
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.4rem;
  text-align: center;
`;

const FileInputSubtext = styled.span`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
`;

const SelectedFile = styled.div`
  margin-top: 0.8rem;
  padding: 0.6rem 0.8rem;
  background-color: var(--primary-black-1);
  border-radius: 6px;
  font-size: 1.2rem;
  color: var(--secondary-orange-1);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileIcon = styled.span`
  font-size: 1.2rem;
  flex-shrink: 0;
`;

const OptionalText = styled.span`
  font-size: 1.1rem;
  color: var(--secondary-orange-1);
  font-style: italic;
  margin-left: 0.5rem;
`;

const Divider = styled.div`
  height: 1px;
  background-color: var(--primasy-stroke-1);
  margin: 1.2rem 0;
  opacity: 0.5;
  width: 90%;
  margin-left: auto;
  margin-right: auto;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-top: 2rem;
`;

export function AddDocumentModal({ 
  isOpen, 
  onClose, 
  onAdd 
}) {
  const [documentName, setDocumentName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!documentName.trim()) {
      alert("Введите название документа");
      return;
    }

    if (!effectiveDate) {
      alert("Введите дату вступления в силу");
      return;
    }

    if (!responsiblePerson.trim()) {
      alert("Введите ответственного");
      return;
    }

    // Преобразуем дату из YYYY-MM-DD в DD.MM.YYYY
    const dateObj = new Date(effectiveDate);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    const newDocument = {
      id: Date.now(), // Генерируем уникальный ID
      name: documentName,
      date: formattedDate,
      owner: responsiblePerson,
      file: selectedFile
    };

    onAdd(newDocument);
    handleClose();
  };

  const handleClose = () => {
    setDocumentName("");
    setEffectiveDate("");
    setResponsiblePerson("");
    setSelectedFile(null);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Добавление документа"
    >
      <FileInput>
        <input
          type="file"
          id="file-upload-add"
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
        />
        <FileButton htmlFor="file-upload-add">
          <FileInputText>Выберите документ для загрузки <OptionalText>(необязательно)</OptionalText></FileInputText>
          <FileInputSubtext>Поддерживаемые форматы: PDF, DOC, DOCX, TXT</FileInputSubtext>
          <FileInputSubtext>Загрузка файла временно отключена для тестирования</FileInputSubtext>
        </FileButton>
        {selectedFile && (
          <SelectedFile>
            <FileIcon>📄</FileIcon>
            <span>{selectedFile.name}</span>
          </SelectedFile>
        )}
      </FileInput>

      <InputGroup>
        <Label>Название документа</Label>
        <Input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Введите название документа"
        />
      </InputGroup>

      <InputGroup>
        <Label>Дата вступления в силу документа</Label>
        <Input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />
      </InputGroup>

      <InputGroup>
        <Label>Ответственный</Label>
        <Input
          type="text"
          value={responsiblePerson}
          onChange={(e) => setResponsiblePerson(e.target.value)}
          placeholder="Введите ФИО ответственного"
        />
      </InputGroup>

      <ButtonGroup>
        <ModalButton variant="alert" onClick={handleClose}>
          Отмена
        </ModalButton>
        <ModalButton variant="alert" onClick={handleSubmit}>
          Добавить
        </ModalButton>
      </ButtonGroup>
    </Modal>
  );
}
import styled from "styled-components";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "../Button/button";

const InputGroup = styled.div`
  margin-bottom: 1.6rem;
  width: 80%; /* Уменьшил ширину */
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
  width: 80%; /* Уменьшил ширину */
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
  min-height: 60px;
  
  &:hover {
    border-color: var(--secondary-orange-1);
    background-color: rgba(35, 38, 48, 0.8);
  }
`;

const FileInputText = styled.span`
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.2rem;
  text-align: center;
`;

const FileInputSubtext = styled.span`
  font-size: 1.1rem;
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

const DocumentName = styled.div`
  font-size: 1.4rem;
  margin-bottom: 1.6rem;
  padding: 0.8rem 1.2rem;
  background-color: var(--primary-black-3);
  border-radius: 8px;
  border-left: 3px solid var(--secondary-orange-1);
  color: var(--primary-white-1);
  line-height: 1.4;
  text-align: center;
  width: 80%; /* Уменьшил ширину */
  margin-left: auto;
  margin-right: auto;
`;

const Divider = styled.div`
  height: 1px;
  background-color: var(--primasy-stroke-1);
  margin: 1.2rem 0;
  opacity: 0.5;
  width: 90%; /* Уменьшил ширину */
  margin-left: auto;
  margin-right: auto;
`;

export function EditDocumentModal({ 
  isOpen, 
  onClose, 
  document, 
  onSave 
}) {
  const [effectiveDate, setEffectiveDate] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    // Убрал проверку даты - достаточно только ввода
    onSave({
      ...document,
      effectiveDate,
      file: selectedFile
    });
    handleClose();
  };

  const handleClose = () => {
    setEffectiveDate("");
    setSelectedFile(null);
    onClose();
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return "";
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <h2 style={{ 
        fontSize: "1.8rem",
        marginBottom: "1rem",
        color: "var(--primary-white-1)",
        fontWeight: "600",
        textAlign: "center"
      }}>
        Редактирование документа
      </h2>
      
      <DocumentName>
        "{document?.name}"
      </DocumentName>
      
      <Divider />
      
      <FileInput>
        <input
          type="file"
          id="file-upload"
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
        />
        <FileButton htmlFor="file-upload">
          <FileInputText>Загрузите обновлённый документ</FileInputText>
          <FileInputSubtext>Поддерживаемые форматы: PDF, DOC, DOCX, TXT</FileInputSubtext>
        </FileButton>
        {selectedFile && (
          <SelectedFile>
            <FileIcon>📄</FileIcon>
            <span>{selectedFile.name}</span>
          </SelectedFile>
        )}
      </FileInput>
      
      <Divider />
      
      <InputGroup>
        <Label>Дата вступления документа в силу</Label>
        <Input
          type="date"
          value={effectiveDate || formatDateForInput(document?.date)}
          onChange={(e) => setEffectiveDate(e.target.value)}
          // Убрал required и min - просто поле ввода
        />
      </InputGroup>
      
      <Divider />
      
      <div style={{ 
        display: "flex", 
        gap: "1.2rem", 
        justifyContent: "center",
        marginTop: "1.2rem"
      }}>
        <Button variant="danger" onClick={handleClose}>
          Отмена
        </Button>
        <Button variant="alert" onClick={handleSubmit}>
          Сохранить изменения
        </Button>
      </div>
    </Modal>
  );
}
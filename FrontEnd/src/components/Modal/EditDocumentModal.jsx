import styled from "styled-components";
import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { ModalButton } from "./ModalStyles";

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

const Select = styled.select`
  width: 100%;
  padding: 1rem 1.2rem;
  background-color: var(--primary-black-3);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  color: var(--primary-white-1);
  font-size: 1.4rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--secondary-orange-1);
    box-shadow: 0 0 0 2px rgba(219, 101, 75, 0.2);
  }

  option {
    background-color: var(--primary-black-3);
    color: var(--primary-white-1);
  }
`;

const RequiredMark = styled.span`
  color: var(--secondary-orange-1);
  margin-left: 0.3rem;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 1.2rem;
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  border-left: 3px solid #ef4444;
  text-align: center;
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState("all");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [error, setError] = useState("");

  // Инициализируем поля при открытии модалки
  useEffect(() => {
    if (isOpen && document) {
      setTitle(document.title || document.name || '');
      setAccessLevel(document.access_level || 'all');

      // Устанавливаем дату вступления в силу
      if (document.effective_date) {
        const dateObj = new Date(document.effective_date);
        const formatted = dateObj.toISOString().split('T')[0];
        setEffectiveDate(formatted);
      } else {
        setEffectiveDate("");
      }
    }
  }, [isOpen, document]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    // Сбрасываем предыдущую ошибку
    setError("");

    // Валидация названия
    if (!title.trim()) {
      setError("Пожалуйста, введите название документа");
      return;
    }

    // Валидация даты при загрузке нового файла
    if (selectedFile && effectiveDate) {
      const selectedDate = new Date(effectiveDate);
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      if (selectedDate < tenYearsAgo) {
        setError("Дата вступления в силу не может быть старше 10 лет");
        return;
      }
    }

    // Формируем данные для отправки
    const updateData = {
      id: document.id,
      title: title.trim(),
      access_level: accessLevel,
      effective_from: effectiveDate || null,
      file: selectedFile
    };

    onSave(updateData);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setTitle("");
    setAccessLevel("all");
    setEffectiveDate("");
    setError("");
    onClose();
  };

  // Убрал функцию formatDateForInput, т.к. теперь используем useEffect

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

      <Divider />

      <InputGroup>
        <Label>
          Название документа<RequiredMark>*</RequiredMark>
        </Label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите название документа"
          required
        />
      </InputGroup>

      <InputGroup>
        <Label>Уровень доступа</Label>
        <Select
          value={accessLevel}
          onChange={(e) => setAccessLevel(e.target.value)}
        >
          <option value="all">Доступен всем сотрудникам</option>
          <option value="hr_only">Только HR и администраторы</option>
        </Select>
      </InputGroup>

      <Divider />

      <InputGroup>
        <Label>Дата вступления документа в силу (при загрузке нового файла)</Label>
        <Input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />
      </InputGroup>

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

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div style={{
        display: "flex",
        gap: "1.2rem",
        justifyContent: "center",
        marginTop: "1.2rem"
      }}>
        <ModalButton variant="alert" onClick={handleClose}>
          Отмена
        </ModalButton>
        <ModalButton variant="alert" onClick={handleSubmit}>
          Сохранить изменения
        </ModalButton>
      </div>
    </Modal>
  );
}
import styled from "styled-components";
import { useState } from "react";
import { Modal } from "./Modal";
import { ModalButton } from "./ModalStyles";

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

const RequiredMark = styled.span`
  color: var(--secondary-orange-1);
  margin-left: 0.3rem;
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

  &:invalid:not(:placeholder-shown) {
    border-color: #ef4444;
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

const ErrorMessage = styled.div`
  color: var(--secondary-red-1);
  font-size: 1.2rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.8rem;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
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
  onAdd,
  currentUser
}) {
  const [documentName, setDocumentName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [accessLevel, setAccessLevel] = useState("all");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверка расширения файла сразу при выборе
      // .wiki и .faq удалены - для FAQ используйте Markdown (.md)
      const allowedExtensions = ['.txt', '.pdf', '.docx', '.md'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        setError(`Поддерживаются только файлы: ${allowedExtensions.join(', ')}`);
        return;
      }

      setError("");
      setSelectedFile(file);
      // Автозаполнение названия документа из имени файла (без расширения)
      const fileName = file.name;
      const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      if (!documentName.trim()) {
        setDocumentName(fileNameWithoutExt);
      }
    }
  };

  const handleSubmit = () => {
    // Сбрасываем предыдущую ошибку
    setError("");

    if (!selectedFile) {
      setError("Пожалуйста, выберите файл документа");
      return;
    }

    if (!documentName.trim()) {
      setError("Пожалуйста, введите название документа");
      return;
    }

    if (!effectiveDate) {
      setError("Пожалуйста, выберите дату вступления в силу");
      return;
    }

    // Валидация даты - проверяем, что дата не слишком старая (более 10 лет назад)
    const selectedDate = new Date(effectiveDate);
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    if (selectedDate < tenYearsAgo) {
      setError("Дата вступления в силу не может быть старше 10 лет");
      return;
    }

    // Преобразуем дату из YYYY-MM-DD в DD.MM.YYYY
    const dateObj = new Date(effectiveDate);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    const newDocument = {
      name: documentName,
      date: formattedDate,
      owner: currentUser?.first_name || currentUser?.username || 'Администратор',
      file: selectedFile,
      effective_date: effectiveDate, // YYYY-MM-DD формат для API
      access_level: accessLevel // Уровень доступа: all, hr_only
    };

    onAdd(newDocument);
    handleClose();
  };

  const handleClose = () => {
    setDocumentName("");
    setEffectiveDate("");
    setSelectedFile(null);
    setAccessLevel("all");
    setError("");
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Добавление документа"
    >
      <FileInput>
        <Label>
          Документ<RequiredMark>*</RequiredMark>
        </Label>
        <input
          type="file"
          id="file-upload-add"
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,.md"
          required
        />
        <FileButton htmlFor="file-upload-add">
          <FileInputText>Выберите документ для загрузки</FileInputText>
          <FileInputSubtext>Поддерживаемые форматы: PDF, DOCX, TXT, MD</FileInputSubtext>
        </FileButton>
        {selectedFile && (
          <SelectedFile>
            <FileIcon>📄</FileIcon>
            <span>{selectedFile.name}</span>
          </SelectedFile>
        )}
      </FileInput>

      <InputGroup>
        <Label>
          Название документа<RequiredMark>*</RequiredMark>
        </Label>
        <Input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Введите название документа"
          required
        />
      </InputGroup>

      <InputGroup>
        <Label>
          Дата вступления в силу документа<RequiredMark>*</RequiredMark>
        </Label>
        <Input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
        />
      </InputGroup>

      <InputGroup>
        <Label>Уровень доступа</Label>
        <Select
          value={accessLevel}
          onChange={(e) => setAccessLevel(e.target.value)}
        >
          <option value="all">Для всех сотрудников</option>
          <option value="hr_only">Только для HR и администраторов</option>
        </Select>
      </InputGroup>

      {error && <ErrorMessage>{error}</ErrorMessage>}

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
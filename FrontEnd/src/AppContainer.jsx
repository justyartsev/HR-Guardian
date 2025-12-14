import { useState } from "react";
import App from "./App";

const mockDocuments = [
  { 
    id: 1,
    name: "Регламент об отпускных днях", 
    date: "21.06.2025", 
    owner: "Петров Петр Петрович" 
  },
  { 
    id: 2,
    name: "Правила внутреннего распорядка", 
    date: "15.06.2025", 
    owner: "Иванова Мария Сергеевна" 
  },
];

const mockComplaints = [
  { 
    id: 1,
    name: "Жалоба №124", 
    date: "20.06.2025", 
    user: "Сидоров Алексей" 
  },
  { 
    id: 2,
    name: "Жалоба №125", 
    date: "18.06.2025", 
    user: "Кузнецова Анна" 
  },
];

export function AppContainer() {
  const [documents, setDocuments] = useState(mockDocuments);
  const [complaints] = useState(mockComplaints);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [text, setText] = useState("");

  // ===== handlers =====

  const handleEdit = (document) => {
    setSelectedDocument(document);
    setIsEditModalOpen(true);
  };

  const handleDelete = (document) => {
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (document) => {
    console.log("Удаляем документ:", document);

    setDocuments(prev =>
      prev.filter(doc => doc.id !== document.id)
    );
  };

  const handleSaveDocument = (updatedDocument) => {
    console.log("Сохраняем документ:", updatedDocument);

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === selectedDocument.id
          ? { 
              ...doc, 
              ...updatedDocument, 
              date: new Date().toLocaleDateString("ru-RU") 
            }
          : doc
      )
    );
  };

  const handleSend = () => {
    if (!text.trim()) return;

    console.log("Отправлено:", text);
    setText("");
  };

  return (
    <App
      documents={documents}
      complaints={complaints}
      selectedDocument={selectedDocument}
      isEditModalOpen={isEditModalOpen}
      isDeleteModalOpen={isDeleteModalOpen}
      text={text}

      onEdit={handleEdit}
      onDelete={handleDelete}
      onConfirmDelete={handleConfirmDelete}
      onSaveDocument={handleSaveDocument}
      onSend={handleSend}
      onTextChange={setText}
      closeEditModal={() => setIsEditModalOpen(false)}
      closeDeleteModal={() => setIsDeleteModalOpen(false)}
    />
  );
}

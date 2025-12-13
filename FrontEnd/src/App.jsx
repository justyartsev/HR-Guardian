import { useState } from "react";
import { Button } from './components/Button/button.jsx'
import { Message } from './components/Message/message.jsx'
import { Input } from './components/input/Input.jsx'
import { Table } from "./components/Table/Table";
import { EditDocumentModal } from "./components/Modal/EditDocumentModal";
import { DeleteDocumentModal } from "./components/Modal/DeleteDocumentModal";

const mockDocuments = [
  { 
    name: "Регламент об отпускных днях", 
    date: "21.06.2025", 
    owner: "Петров Петр Петрович" 
  },
  { 
    name: "Правила внутреннего распорядка", 
    date: "15.06.2025", 
    owner: "Иванова Мария Сергеевна" 
  },
];

const mockComplaints = [
  { 
    name: "Жалоба №124", 
    date: "20.06.2025", 
    user: "Сидоров Алексей" 
  },
  { 
    name: "Жалоба №125", 
    date: "18.06.2025", 
    user: "Кузнецова Анна" 
  },
];

function App() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documents, setDocuments] = useState(mockDocuments);

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
    // Здесь будет запрос к API
    setDocuments(documents.filter(doc => doc.id !== document.id));
  };

  const handleSaveDocument = (updatedDocument) => {
    console.log("Сохраняем документ:", updatedDocument);
    // Здесь будет запрос к API
    setDocuments(documents.map(doc => 
      doc.id === selectedDocument.id 
        ? { ...doc, ...updatedDocument, date: new Date().toLocaleDateString('ru-RU') }
        : doc
    ));
  };

  const [text, setText] = useState("");
  

  const handleSend = () => {
    if (!text.trim()) return;

    
    console.log("Отправлено:", text);

    setText("");
  };


  return (
    <div style={{backgroundColor: "darkblue"}}>
      <Button style={{width: "400px", minHeight: "50px"}} >qweqwewqwe</Button>
      <div style={{ padding: "40px", maxWidth: "500px" }}>
      <Input
        placeholder="Введите сообщение..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onSend={handleSend}
      />
    </div>
      <Message type={"output"} alertMsg="weqiuryjbdsfudsiyarweagjguh">loremas dqwewqeqweq wewqeqwe  qwe qweqw32reawafasd asdwe qweqweqwedsaq weqweqwe qweqwsadeqwe gjkysadd siugusidfhgaj kdhbeuw iraghtriul</Message>
      <Message type={"input"}>asdasds</Message>
      {/* Таблица документов */}
      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ 
          color: "white", 
          marginBottom: "20px", 
          fontSize: "1.8rem" 
        }}>
          Документы
        </h2>
        <Table 
          data={mockDocuments}
          type="documents"
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Таблица жалоб */}
      <div>
        <h2 style={{ 
          color: "white", 
          marginBottom: "20px", 
          fontSize: "1.8rem" 
        }}>
          Жалобы
        </h2>
        <Table 
          data={mockComplaints}
          type="complaints"
          onDelete={handleDelete}
        />
      </div>
      {/* Модальные окна */}
      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        document={selectedDocument}
        onSave={handleSaveDocument}
      />

      <DeleteDocumentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        document={selectedDocument}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default App

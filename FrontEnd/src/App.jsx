import { Button } from "./components/Button/button.jsx";
import { Message } from "./components/Message/message.jsx";
import { Input } from "./components/input/Input.jsx";
import { Table } from "./components/Table/Table";
import { EditDocumentModal } from "./components/Modal/EditDocumentModal";
import { DeleteDocumentModal } from "./components/Modal/DeleteDocumentModal";

function App({
  documents,
  complaints,
  selectedDocument,
  isEditModalOpen,
  isDeleteModalOpen,
  text,

  onEdit,
  onDelete,
  onConfirmDelete,
  onSaveDocument,
  onSend,
  onTextChange,
  closeEditModal,
  closeDeleteModal,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "darkblue",
        display: "flex",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          padding: "40px"
        }}
      >
        <Button style={{ width: "400px", minHeight: "50px" }}>
          qweqwewqwe
        </Button>

        <div style={{ padding: "40px", maxWidth: "500px" }}>
          <Input
            placeholder="Введите сообщение..."
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onSend={onSend}
          />
        </div>

        <Message variant="output" alertMsg="weqiuryjbdsfudsiyarweagjguh">
          loremas dqwewqeqweq wewqeqwe
        </Message>

        <Message variant="input">asdasds</Message>

        {/* Документы */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ color: "white", marginBottom: "20px" }}>
            Документы
          </h2>

          <Table
            data={documents}
            type="documents"
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>

        {/* Жалобы */}
        <div>
          <h2 style={{ color: "white", marginBottom: "20px" }}>
            Жалобы
          </h2>

          <Table
            data={complaints}
            type="complaints"
            onDelete={onDelete}
          />
        </div>

        {/* Модалки */}
        <EditDocumentModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          document={selectedDocument}
          onSave={onSaveDocument}
        />

        <DeleteDocumentModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          document={selectedDocument}
          onConfirm={onConfirmDelete}
        />
      </div>
    </div>
  );
}

export default App;

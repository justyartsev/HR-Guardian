import { Tr, Td, Actions, IconButton } from "./table.styles";
import { FiEdit, FiTrash2 } from "react-icons/fi";

export function TableRow({ item, type, onEdit, onDelete }) {
  const getCellContent = (key) => {
    switch (key) {
      case "date":
        return item.date;
      case "owner":
      case "user":
        return item.owner || item.user;
      case "name":
        return item.name;
      default:
        return "";
    }
  };
    const handleEdit = () => {
        onEdit(item); // Передаем весь объект документа
    };

    const handleDelete = () => {
        onDelete(item); // Передаем весь объект документа
    };

  return (
    <Tr>
      <Td>{item.name}</Td>
      <Td>{item.date}</Td>
      <Td>{item.owner || item.user}</Td>
      <Td>
        <Actions>
          {type === "documents" && (
            <IconButton onClick={onEdit}>
              <FiEdit />
            </IconButton>
          )}
          <IconButton className="danger" onClick={onDelete}>
            <FiTrash2 />
          </IconButton>
        </Actions>
      </Td>
    </Tr>
  );
}
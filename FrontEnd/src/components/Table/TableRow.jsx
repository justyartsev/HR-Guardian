import { Tr, Td, Actions, IconButton } from "./table.styles";
import { FiEdit, FiTrash2 } from "react-icons/fi";

export function TableRow({ name, date, owner, onEdit, onDelete }) {
    return (
        <Tr>
            <Td>{name}</Td>
            <Td>{date}</Td>
            <Td>{owner}</Td>
            <Td>
                <Actions>
                    <IconButton onClick={onEdit}>
                        <FiEdit />
                    </IconButton>
                    <IconButton className="danger" onClick={onDelete}>
                        <FiTrash2 />
                    </IconButton>
                </Actions>
            </Td>
        </Tr>
    );
}

import { TableWrapper, StyledTable, Thead, Th, Tbody } from "./table.styles";
import { TableRow } from "./TableRow";

export function Table({ 
  data, 
  type = "documents", // По умолчанию таблица документов
  onEdit,
  onDelete 
}) {
  const headers = {
    documents: [
      { key: "name", label: "Название" },
      { key: "date", label: "Дата обновления" },
      { key: "owner", label: "Ответственный" },
      { key: "actions", label: "" }
    ],
    complaints: [
      { key: "name", label: "Название" },
      { key: "date", label: "Дата создания" },
      { key: "user", label: "Пользователь" },
      { key: "delete", label: "" }
    ]
  };

  const currentHeaders = headers[type];

  return (
    <TableWrapper>
      <StyledTable>
        <Thead>
          <tr>
            {currentHeaders.map((header) => (
              <Th key={header.key}>{header.label}</Th>
            ))}
          </tr>
        </Thead>
        <Tbody>
          {data.map((item, index) => (
            <TableRow
              key={index}
              item={item}
              type={type}
              onEdit={() => onEdit && onEdit(item)}
              onDelete={() => onDelete && onDelete(item)}
            />
          ))}
        </Tbody>
      </StyledTable>
    </TableWrapper>
  );
}
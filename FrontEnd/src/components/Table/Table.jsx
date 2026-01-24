import { TableWrapper, StyledTable, Thead, Th, Tbody } from "./table.styles";
import { TableRow } from "./TableRow";

export function Table({
  data,
  type = "documents", // По умолчанию таблица документов
  onEdit,
  onDelete,
  onView,
  onPreview,
  onCancelUpdate, // Отмена запланированного обновления
  onStatusChange // Новый пропс для изменения статуса жалобы
}) {
  const headers = {
    documents: [
      { key: "name", label: "Название" },
      { key: "effective_from", label: "Вступает в силу" },
      { key: "status", label: "Статус" },
      { key: "version", label: "Версия" },
      { key: "actions", label: "" }
    ],
    complaints: [
      { key: "name", label: "ID" },
      { key: "date", label: "Дата" },
      { key: "user", label: "Пользователь" },
      { key: "status", label: "Статус" },
      { key: "actions", label: "" }
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
              onView={() => onView && onView(item)}
              onPreview={() => onPreview && onPreview(item)}
              onCancelUpdate={onCancelUpdate ? () => onCancelUpdate(item) : null}
              onStatusChange={onStatusChange}
            />
          ))}
        </Tbody>
      </StyledTable>
    </TableWrapper>
  );
}
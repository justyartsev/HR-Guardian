import styled from "styled-components";
import { Tr, Td, Actions, IconButton } from "./table.styles";
import { FiEdit, FiTrash2, FiEye, FiXCircle } from "react-icons/fi";

// Безопасное преобразование значения в строку
const safeString = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toLocaleDateString('ru-RU');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Бейдж статуса
const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: 500;
  white-space: nowrap;
  background-color: ${props => {
    const s = (props.$status || '').toLowerCase();
    // Статусы жалоб
    if (s === 'new') return 'rgba(255, 165, 0, 0.2)';
    if (s === 'acknowledged') return 'rgba(0, 150, 255, 0.2)';
    if (s === 'resolved') return 'rgba(0, 200, 100, 0.2)';
    // Статусы документов (русские)
    if (s === 'актуальная') return 'rgba(76, 175, 80, 0.2)';
    if (s === 'архивная') return 'rgba(158, 158, 158, 0.2)';
    if (s === 'ожидает активации' || s === 'ожидает обработки') return 'rgba(255, 193, 7, 0.2)';
    if (s === 'ошибка') return 'rgba(244, 67, 54, 0.2)';
    // Статусы документов (английские - fallback)
    if (s === 'synced') return 'rgba(76, 175, 80, 0.2)';
    if (s === 'pending') return 'rgba(255, 193, 7, 0.2)';
    if (s === 'archived') return 'rgba(158, 158, 158, 0.2)';
    if (s === 'error') return 'rgba(244, 67, 54, 0.2)';
    return 'rgba(255, 193, 7, 0.2)';
  }};
  color: ${props => {
    const s = (props.$status || '').toLowerCase();
    if (s === 'new') return '#ffa500';
    if (s === 'acknowledged') return '#0096ff';
    if (s === 'resolved') return '#00c864';
    // Русские статусы
    if (s === 'актуальная') return '#4caf50';
    if (s === 'архивная') return '#9e9e9e';
    if (s === 'ожидает активации' || s === 'ожидает обработки') return '#ffc107';
    if (s === 'ошибка') return '#f44336';
    // Английские статусы
    if (s === 'synced') return '#4caf50';
    if (s === 'pending') return '#ffc107';
    if (s === 'archived') return '#9e9e9e';
    if (s === 'error') return '#f44336';
    return '#ffc107';
  }};
`;

const getStatusLabel = (status, type = 'complaints') => {
  const s = (status || '').toLowerCase();
  if (type === 'complaints') {
    if (s === 'new') return 'Новая';
    if (s === 'acknowledged') return 'Просмотрена';
    if (s === 'resolved') return 'Решена';
    return 'Новая';
  }
  // Документы - сначала проверяем display_status с бэкенда
  if (s === 'актуальная') return 'Актуальная';
  if (s === 'архивная') return 'Архивная';
  if (s === 'ожидает активации') return 'Ожидает активации';
  if (s === 'ожидает обработки') return 'Ожидает обработки';
  if (s === 'ошибка') return 'Ошибка';
  // Fallback на sync_status
  if (s === 'synced') return 'Актуальная';
  if (s === 'pending') return 'Ожидание';
  if (s === 'archived') return 'Архивная';
  if (s === 'error') return 'Ошибка';
  return 'Ожидание';
};

export function TableRow({ item, type, onEdit, onDelete, onView, onPreview, onCancelUpdate, onStatusChange }) {
  const getCellContent = (key) => {
    switch (key) {
      case "date":
        return safeString(item.date);
      case "version":
        return `v${item.version || 0}`;
      case "owner":
      case "user":
        return safeString(item.owner || item.user);
      case "name":
        return safeString(item.name);
      case "comment":
        // Ограничиваем длину комментария в таблице
        const comment = safeString(item.comment);
        return comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
      default:
        return "";
    }
  };
    const handleEdit = () => {
        onEdit(item); // Передаем весь объект документа
    };

    const handleView = () => {
        onView(item); // Передаем весь объект жалобы
    };

    const handleDelete = () => {
        onDelete(item); // Передаем весь объект документа
    };

    const handlePreview = () => {
        if (onPreview) {
            onPreview(item); // Передаем весь объект документа для предпросмотра
        }
    };

    const handleCancelUpdate = () => {
        if (onCancelUpdate) {
            onCancelUpdate(item); // Отмена запланированного обновления
        }
    };

  // Проверяем, можно ли отменить (pending статус)
  const canCancel = type === 'documents' && onCancelUpdate && 
    (item.status === 'pending' || 
     item.status === 'ожидает активации' || 
     item.status === 'ожидает обработки');

  return (
    <Tr>
      <Td>{safeString(item.name)}</Td>
      {type === "complaints" && <Td>{safeString(item.date)}</Td>}
      {type === "documents" && <Td>{safeString(item.effective_from) || '—'}</Td>}
      {type === "documents" && (
        <Td>
          <StatusBadge $status={item.status || 'pending'}>
            {getStatusLabel(item.status, 'documents')}
          </StatusBadge>
        </Td>
      )}
      {type === "documents" && <Td>v{item.version || 0}</Td>}
      {type === "complaints" && <Td>{safeString(item.user)}</Td>}
      {type === "complaints" && (
        <Td>
          <StatusBadge $status={item.status || 'new'}>
            {getStatusLabel(item.status, 'complaints')}
          </StatusBadge>
        </Td>
      )}
      <Td>
        <Actions>
          {type === "documents" && (
            <IconButton onClick={handlePreview} title="Предпросмотр">
              <FiEye />
            </IconButton>
          )}
          {type !== "complaints" && (
            <IconButton onClick={onEdit} title="Редактировать">
              <FiEdit />
            </IconButton>
          )}
          {type === "complaints" && (
            <IconButton onClick={handleView} title="Просмотр">
              <FiEye />
            </IconButton>
          )}
          {canCancel && (
            <IconButton className="warning" onClick={handleCancelUpdate} title="Отменить обновление">
              <FiXCircle />
            </IconButton>
          )}
          <IconButton className="danger" onClick={onDelete} title="Удалить">
            <FiTrash2 />
          </IconButton>
        </Actions>
      </Td>
    </Tr>
  );
}
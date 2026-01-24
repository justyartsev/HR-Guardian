import { useState } from "react";
import styled from "styled-components";
import { Modal } from "./Modal";
import { ModalButton } from "./ModalStyles";

const DocumentIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const DocumentHeader = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.6rem;
  color: var(--primary-white-1);
  font-weight: 600;
  text-align: center;
`;

const Section = styled.div`
  margin-bottom: 1.6rem;
  padding-bottom: 1.6rem;
  border-bottom: 1px solid var(--primasy-stroke-1);

  &:last-child {
    border-bottom: none;
  }
`;

const SectionLabel = styled.label`
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--secondary-orange-1);
  margin-bottom: 0.6rem;
`;

const SectionContent = styled.div`
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
`;

const PreviewBox = styled.div`
  background-color: var(--primary-black-2);
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  padding: 1.2rem;
  max-height: 400px;
  overflow-y: auto;
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;

  /* Скроллбар */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const PDFPreview = styled.iframe`
  width: 100%;
  height: 500px;
  border: 1px solid var(--primasy-stroke-1);
  border-radius: 8px;
  background-color: #fff;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-top: 2rem;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 1.2rem;
  font-weight: 600;
  background-color: ${props => {
    const s = (props.status || '').toLowerCase();
    if (s === 'актуальная') return 'rgba(76, 175, 80, 0.2)';
    if (s === 'архивная') return 'rgba(158, 158, 158, 0.2)';
    if (s === 'ожидает активации' || s === 'ожидает обработки') return 'rgba(255, 193, 7, 0.2)';
    if (s === 'ошибка') return 'rgba(244, 67, 54, 0.2)';
    if (s === 'synced') return 'rgba(76, 175, 80, 0.2)';
    if (s === 'pending') return 'rgba(255, 193, 7, 0.2)';
    if (s === 'error') return 'rgba(244, 67, 54, 0.2)';
    return 'rgba(255, 193, 7, 0.2)';
  }};
  color: ${props => {
    const s = (props.status || '').toLowerCase();
    if (s === 'актуальная') return '#4caf50';
    if (s === 'архивная') return '#9e9e9e';
    if (s === 'ожидает активации' || s === 'ожидает обработки') return '#ffc107';
    if (s === 'ошибка') return '#f44336';
    if (s === 'synced') return '#4caf50';
    if (s === 'pending') return '#ffc107';
    if (s === 'error') return '#f44336';
    return '#ffc107';
  }};
`;

const VersionsList = styled.div`
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
`;

const VersionItem = styled.div`
  background-color: ${props => props.$selected ? 'rgba(247, 144, 9, 0.1)' : 'var(--primary-black-2)'};
  border: 1px solid ${props => props.$selected ? 'var(--secondary-orange-1)' : 'var(--primasy-stroke-1)'};
  border-radius: 8px;
  padding: 1.2rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--secondary-orange-1);
    background-color: rgba(247, 144, 9, 0.05);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const VersionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
`;

const VersionInfo = styled.div`
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.7);
`;

const VersionComment = styled.div`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  margin-top: 0.6rem;
`;

const VersionActions = styled.div`
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.$variant === 'restore' ? 'var(--secondary-orange-1)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$variant === 'restore' ? '#000' : '#fff'};
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const getFileFormat = (version) => {
  if (!version || !version.file_path) return null;
  const ext = version.file_path.split('.').pop()?.toLowerCase();
  return ext;
};

export function PreviewDocumentModal({
  isOpen,
  onClose,
  document,
  onRestoreVersion,
  isRestoring = false
}) {
  const [selectedVersion, setSelectedVersion] = useState(null);

  if (!document) {
    return null;
  }

  const handleRestore = (versionId) => {
    if (onRestoreVersion) {
      onRestoreVersion(document.id, versionId);
    }
  };

  const handleDownload = async (versionId) => {
    try {
      const { downloadDocumentFromAPI } = await import('../../utils/downloadUtils');
      const filename = `${document.title || 'document'}_v${versionId}`;
      await downloadDocumentFromAPI(document.id, filename, document.format, versionId);
    } catch (error) {
      console.error('Download error:', error);
      alert('Ошибка при скачивании файла');
    }
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
  };

  // Сортируем версии по дате (новые сначала)
  const sortedVersions = [...(document.versions || [])].sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  // Выбираем версию для предпросмотра (выбранная или текущая)
  const previewVersion = selectedVersion || sortedVersions.find(v => v.id === document.currentVersionId) || sortedVersions[0];
  const previewFormat = getFileFormat(previewVersion);
  const canPreviewPDF = previewFormat === 'pdf';
  const canPreviewText = ['txt', 'md', 'html'].includes(previewFormat);

  const token = localStorage.getItem('access_token');
  const previewUrl = previewVersion
    ? `/api/documents/${document.id}/preview?version_id=${previewVersion.id}&token=${token}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <DocumentIcon>📄</DocumentIcon>
      <DocumentHeader>{document.name || document.title}</DocumentHeader>

      <Section>
        <SectionLabel>Текущий статус:</SectionLabel>
        <SectionContent>
          <StatusBadge status={document.status || document.displayStatus}>
            {document.status || document.displayStatus || 'Неизвестно'}
          </StatusBadge>
        </SectionContent>
      </Section>

      {document.effective_from && (
        <Section>
          <SectionLabel>Дата активации:</SectionLabel>
          <SectionContent>{document.effective_from}</SectionContent>
        </Section>
      )}

      <Section>
        <SectionLabel>Уровень доступа:</SectionLabel>
        <SectionContent>
          {document.access_level === 'hr_only' ? 'Только HR/Admin' : 'Все пользователи'}
        </SectionContent>
      </Section>

      <Section>
        <SectionLabel>Количество версий:</SectionLabel>
        <SectionContent>v{document.versions?.length || 0}</SectionContent>
      </Section>

      {previewVersion && (
        <Section>
          <SectionLabel>
            Предпросмотр {selectedVersion ? `(версия от ${new Date(selectedVersion.created_at).toLocaleDateString('ru-RU')})` : '(текущая версия)'}:
          </SectionLabel>
          {canPreviewPDF && previewUrl ? (
            <PDFPreview
              src={previewUrl}
              title="PDF Preview"
            />
          ) : canPreviewText && previewVersion.content ? (
            <PreviewBox>
              {previewVersion.content.substring(0, 3000)}
              {previewVersion.content.length > 3000 && '\n\n... (текст сокращен)'}
            </PreviewBox>
          ) : (
            <PreviewBox>
              Предпросмотр недоступен для файлов формата .{previewFormat}
              <br />
              <br />
              <ActionButton onClick={() => handleDownload(previewVersion.id)}>
                Скачать для просмотра
              </ActionButton>
            </PreviewBox>
          )}
        </Section>
      )}

      {sortedVersions.length > 0 && (
        <Section>
          <SectionLabel>История версий (кликните для предпросмотра):</SectionLabel>
          <VersionsList>
            {sortedVersions.map((version) => {
              const versionDate = new Date(version.created_at).toLocaleString('ru-RU');
              const displayStatus = version.display_status || version.sync_status || 'Неизвестно';
              const isArchived = displayStatus.toLowerCase() === 'архивная';
              const isCurrent = version.id === document.currentVersionId;
              const isSelected = selectedVersion?.id === version.id;
              const format = getFileFormat(version);

              return (
                <VersionItem
                  key={version.id}
                  $selected={isSelected}
                  onClick={() => handleVersionSelect(version)}
                >
                  <VersionHeader>
                    <div style={{ flex: 1 }}>
                      <VersionInfo>
                        <strong>{versionDate}</strong> • <StatusBadge status={displayStatus}>{displayStatus}</StatusBadge>
                        {format && ` • .${format}`}
                      </VersionInfo>
                      {version.change_comment && (
                        <VersionComment>
                          Комментарий: {version.change_comment}
                        </VersionComment>
                      )}
                      {version.effective_from && (
                        <VersionComment>
                          Дата вступления: {new Date(version.effective_from).toLocaleString('ru-RU')}
                        </VersionComment>
                      )}
                    </div>
                    <VersionActions onClick={(e) => e.stopPropagation()}>
                      <ActionButton onClick={() => handleDownload(version.id)}>
                        📥 Скачать
                      </ActionButton>
                      {isArchived && !isCurrent && onRestoreVersion && (
                        <ActionButton
                          $variant="restore"
                          onClick={() => handleRestore(version.id)}
                          disabled={isRestoring}
                        >
                          {isRestoring ? 'Восстановление...' : '↻ Восстановить'}
                        </ActionButton>
                      )}
                    </VersionActions>
                  </VersionHeader>
                </VersionItem>
              );
            })}
          </VersionsList>
        </Section>
      )}

      <ButtonGroup>
        <ModalButton onClick={onClose}>Закрыть</ModalButton>
      </ButtonGroup>
    </Modal>
  );
}

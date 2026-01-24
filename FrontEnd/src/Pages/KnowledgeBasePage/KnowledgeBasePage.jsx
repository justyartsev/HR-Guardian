import styled from "styled-components";
import SideMenu from "../../components/SideMenu/sideMenu";
import { Table } from "../../components/Table/Table";
import { Button } from "../../components/Button/button";

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--primary-black-2);
  color: var(--primary-white-1);
  width: 100vw;
  /* overflow-x: hidden удален - блокирует прокрутку таблиц */
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem 3rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    135deg,
    var(--primary-black-1) 0%,
    var(--primary-black-3) 100%
  );
  min-height: 100vh;
  
  @media (max-width: 768px) {
    padding: 1.5rem 1.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 1rem 1rem;
  }
`;

const Title = styled.h1`
  font-size: 3.2rem;
  color: var(--primary-white-1);
  margin-bottom: 2rem;
  font-weight: 600;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--primasy-stroke-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: 2.4rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    white-space: normal;
  }
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  color: var(--primary-white-1);
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--primasy-stroke-1);
`;

const AddButtonWrapper = styled.div`
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
`;

export function KnowledgeBasePage({ 
  documents,
  pendingDocuments,
  userInfo, 
  onTabChange, 
  chats, 
  onNewChat, 
  onChatSelect,
  onRenameChat, 
  onDeleteChat,
  onEditDocument,
  onDeleteDocument,
  onPreviewDocument,
  onCancelUpdate,
  onAddDocument,
  pendingUsersCount = 0,
  newFeedbackCount = 0
}) {
  const handleTabChange = (tab) => {
    if (onTabChange) onTabChange(tab);
  };

  const handleNewChat = () => {
    if (onNewChat) onNewChat();
  };

  const handleChatSelect = (chat) => {
    if (onChatSelect) onChatSelect(chat);
  };

  const handleEditDocument = (document) => {
    if (onEditDocument) onEditDocument(document);
  };

  const handleDeleteDocument = (document) => {
    if (onDeleteDocument) onDeleteDocument(document);
  };

  const handlePreviewDocument = (document) => {
    if (onPreviewDocument) onPreviewDocument(document);
  };

  const handleAddDocument = () => {
    if (onAddDocument) onAddDocument();
  };

  return (
    <LayoutContainer>
      <SideMenu 
        active="knowledge"
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        username={userInfo?.username || "Пользователь"}
        userRole={userInfo?.role}
        onChatSelect={handleChatSelect}
        onRenameChat={onRenameChat}
        onDeleteChat={onDeleteChat}
        pendingUsersCount={pendingUsersCount}
        newFeedbackCount={newFeedbackCount}
      />
      
      <MainContent>
        <Title>База знаний</Title>
        
        <ContentWrapper>
          {/* Активные документы */}
          <div>
            <SectionTitle>Активные документы</SectionTitle>
            {documents && documents.length > 0 ? (
              <Table 
                data={documents}
                type="documents"
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
                onPreview={handlePreviewDocument}
              />
            ) : (
              <div style={{ 
                padding: '2rem',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '1.4rem'
              }}>
                Нет документов
              </div>
            )}
          </div>

          {/* Ожидающие активации документы */}
          <div>
            <SectionTitle>Ожидающие активации</SectionTitle>
            {pendingDocuments && pendingDocuments.length > 0 ? (
              <Table 
                data={pendingDocuments}
                type="documents"
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
                onPreview={handlePreviewDocument}
                onCancelUpdate={onCancelUpdate}
              />
            ) : (
              <div style={{ 
                padding: '2rem',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '1.4rem'
              }}>
                Нет документов
              </div>
            )}
          </div>
          
          <AddButtonWrapper>
            <Button 
              onClick={handleAddDocument}
              style={{ height: '4rem', padding: '0 2rem' }}
            >
              Добавить документ
            </Button>
          </AddButtonWrapper>
        </ContentWrapper>
      </MainContent>
    </LayoutContainer>
  );
}
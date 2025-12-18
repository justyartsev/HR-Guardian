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
  overflow-x: hidden;
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
`;

const Title = styled.h1`
  font-size: 3.2rem;
  color: var(--primary-white-1);
  margin-bottom: 2rem;
  font-weight: 600;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--primasy-stroke-1);
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const AddButtonWrapper = styled.div`
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
`;

export function KnowledgeBasePage({ 
  documents, 
  userInfo, 
  onTabChange, 
  chats, 
  onNewChat, 
  onChatSelect,
  onEditDocument,
  onDeleteDocument,
  onAddDocument 
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
        username={userInfo?.username || "Петров Пётр Петрович"}
        onChatSelect={handleChatSelect}
      />
      
      <MainContent>
        <Title>База знаний</Title>
        
        <ContentWrapper>
          <Table 
            data={documents}
            type="documents"
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
          />
          
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
import styled from "styled-components";
import SideMenu from "../../components/SideMenu/sideMenu";
import { Table } from "../../components/Table/Table";

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

export function QueryLogPage({ 
  complaints, 
  userInfo, 
  onTabChange, 
  chats, 
  onNewChat, 
  onChatSelect,
  onRenameChat, 
  onDeleteChat,
  onDeleteComplaint 
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

  const handleDeleteComplaint = (complaint) => {
    if (onDeleteComplaint) onDeleteComplaint(complaint);
  };

  return (
    <LayoutContainer>
      <SideMenu 
        active="queries"
        onTabChange={handleTabChange}
        chats={chats}
        onNewChat={handleNewChat}
        username={userInfo?.username || "Петров Пётр Петрович"}
        onChatSelect={handleChatSelect}
        onRenameChat={onRenameChat} // Передаем
        onDeleteChat={onDeleteChat}
      />
      
      <MainContent>
        <Title>Журнал запросов</Title>
        
        <ContentWrapper>
          <Table 
            data={complaints}
            type="complaints"
            onDelete={handleDeleteComplaint}
          />
        </ContentWrapper>
      </MainContent>
    </LayoutContainer>
  );
}
import styled from "styled-components";
import SideMenu from "../../components/SideMenu/sideMenu";
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

const UserCard = styled.div`
  background-color: ${props => props.$isCurrentUser ? 'rgba(219, 101, 75, 0.1)' : 'var(--primary-black-3)'};
  border: 1px solid ${props => props.$isCurrentUser ? 'var(--secondary-orange-1)' : 'var(--primasy-stroke-1)'};
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UserName = styled.span`
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--primary-white-1);
`;

const UserEmail = styled.span`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
`;

const UserDetails = styled.span`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.5);
`;

const UserActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const StatusBadge = styled.span`
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: 500;
  background-color: ${props => {
    switch (props.$status) {
      case 'approved': return 'rgba(76, 175, 80, 0.2)';
      case 'pending': return 'rgba(255, 193, 7, 0.2)';
      case 'rejected': return 'rgba(244, 67, 54, 0.2)';
      default: return 'rgba(158, 158, 158, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'approved': return '#4caf50';
      case 'pending': return '#ffc107';
      case 'rejected': return '#f44336';
      default: return '#9e9e9e';
    }
  }};
`;

const RoleBadge = styled.span`
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: 500;
  background-color: ${props => {
    switch (props.$role) {
      case 'admin': return 'rgba(156, 39, 176, 0.2)';
      case 'hr': return 'rgba(33, 150, 243, 0.2)';
      default: return 'rgba(158, 158, 158, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$role) {
      case 'admin': return '#9c27b0';
      case 'hr': return '#2196f3';
      default: return '#9e9e9e';
    }
  }};
`;

const EmptyMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.4rem;
`;

const UsersGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export function UsersPage({
  pendingUsers,
  allUsers,
  userInfo,
  onTabChange,
  chats,
  onNewChat,
  onChatSelect,
  onRenameChat,
  onDeleteChat,
  onApproveUser,
  onRejectUser,
  onChangeRole,
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Локальная версия для отображения пользователей в списке (использует snake_case поля из API)
  const formatUserDisplayName = (user) => {
    if (user.last_name && user.first_name) {
      return `${user.last_name} ${user.first_name}`;
    }
    return user.username;
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'hr': return 'HR';
      default: return 'Сотрудник';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Подтверждён';
      case 'pending': return 'Ожидает';
      case 'rejected': return 'Отклонён';
      default: return status;
    }
  };

  // Фильтруем подтверждённых пользователей (не pending) и сортируем - текущий пользователь первый
  const approvedUsers = (allUsers?.filter(u => u.status !== 'pending') || [])
    .sort((a, b) => {
      if (a.id === userInfo?.id) return -1;
      if (b.id === userInfo?.id) return 1;
      return 0;
    });

  return (
    <LayoutContainer>
      <SideMenu
        active="users"
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
        <Title>Управление пользователями</Title>

        <ContentWrapper>
          {/* Ожидающие подтверждения */}
          <div>
            <SectionTitle>Ожидают подтверждения ({pendingUsers?.length || 0})</SectionTitle>
            {pendingUsers && pendingUsers.length > 0 ? (
              <UsersGrid>
                {pendingUsers.map(user => (
                  <UserCard key={user.id}>
                    <UserInfo>
                      <UserName>{formatUserDisplayName(user)}</UserName>
                      <UserEmail>{user.email}</UserEmail>
                      <UserDetails>
                        {user.position && `${user.position}`}
                        {user.position && user.department && ' | '}
                        {user.department && `${user.department}`}
                        {(user.position || user.department) && ' | '}
                        Зарегистрирован: {formatDate(user.created_at)}
                      </UserDetails>
                    </UserInfo>
                    <UserActions>
                      <Button
                        onClick={() => onApproveUser(user.id, 'approved', 'employee')}
                        style={{ height: '3.2rem', padding: '0 1.2rem', fontSize: '1.2rem' }}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        onClick={() => onApproveUser(user.id, 'approved', 'hr')}
                        style={{ height: '3.2rem', padding: '0 1.2rem', fontSize: '1.2rem' }}
                        variant="secondary"
                      >
                        Как HR
                      </Button>
                      <Button
                        onClick={() => onRejectUser(user.id)}
                        style={{ height: '3.2rem', padding: '0 1.2rem', fontSize: '1.2rem' }}
                        variant="danger"
                      >
                        Отклонить
                      </Button>
                    </UserActions>
                  </UserCard>
                ))}
              </UsersGrid>
            ) : (
              <EmptyMessage>Нет пользователей, ожидающих подтверждения</EmptyMessage>
            )}
          </div>

          {/* Все пользователи */}
          <div>
            <SectionTitle>Все пользователи ({approvedUsers.length})</SectionTitle>
            {approvedUsers.length > 0 ? (
              <UsersGrid>
                {approvedUsers.map(user => (
                  <UserCard key={user.id} $isCurrentUser={user.id === userInfo?.id}>
                    <UserInfo>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <UserName>{formatUserDisplayName(user)}</UserName>
                        <RoleBadge $role={user.role}>{getRoleLabel(user.role)}</RoleBadge>
                        <StatusBadge $status={user.status}>{getStatusLabel(user.status)}</StatusBadge>
                      </div>
                      <UserEmail>{user.email}</UserEmail>
                      <UserDetails>
                        {user.position && `${user.position}`}
                        {user.position && user.department && ' | '}
                        {user.department && `${user.department}`}
                        {(user.position || user.department) && ' | '}
                        Последний вход: {user.last_login ? formatDate(user.last_login) : 'никогда'}
                      </UserDetails>
                    </UserInfo>
                    <UserActions>
                      {/* Нельзя менять роль себе */}
                      {user.id !== userInfo?.id && user.role === 'employee' && (
                        <Button
                          onClick={() => onChangeRole(user.id, 'hr')}
                          style={{ height: '3.2rem', padding: '0 1.2rem', fontSize: '1.2rem' }}
                        >
                          Сделать HR
                        </Button>
                      )}
                      {/* Только admin может понижать HR */}
                      {user.id !== userInfo?.id && user.role === 'hr' && userInfo?.role === 'admin' && (
                        <Button
                          onClick={() => onChangeRole(user.id, 'employee')}
                          style={{ height: '3.2rem', padding: '0 1.2rem', fontSize: '1.2rem' }}
                        >
                          Снять HR
                        </Button>
                      )}
                      {user.id === userInfo?.id && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem' }}>
                          (вы)
                        </span>
                      )}
                    </UserActions>
                  </UserCard>
                ))}
              </UsersGrid>
            ) : (
              <EmptyMessage>Нет зарегистрированных пользователей</EmptyMessage>
            )}
          </div>
        </ContentWrapper>
      </MainContent>
    </LayoutContainer>
  );
}

// Login.jsx
import styled from 'styled-components';
import AuthForm from '../../components/AuthForm/AuthForm';

const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-width: 100vw;
  background: linear-gradient(
    135deg,
    var(--primary-black-1) 0%,
    var(--primary-black-3) 100%
  );
`;

export default function Login() {
  return (
    <PageContainer>
      <AuthForm isLogin={true} />
    </PageContainer>
  );
}
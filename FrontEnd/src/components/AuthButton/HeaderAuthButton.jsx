import styled from 'styled-components';
import { Button } from '../Button/button';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useUser } from '../../contexts/UserContext';

const AuthButtonContainer = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 3rem;
  z-index: 100;
`;

export function HeaderAuthButton() {
  const navigate = useNavigate();
  const { clearUserData } = useUser();
  const isAuthenticated = authService.isAuthenticated();

  const handleClick = () => {
    if (isAuthenticated) {
      localStorage.clear();
      sessionStorage.clear();
      clearUserData();
      window.location.replace('/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <AuthButtonContainer>
      <Button
        onClick={handleClick}
        style={{ height: '4rem', padding: '0 2rem' }}
        variant={isAuthenticated ? "danger" : ""}
      >
        {isAuthenticated ? 'Выйти' : 'Войти / Зарегистрироваться'}
      </Button>
    </AuthButtonContainer>
  );
}
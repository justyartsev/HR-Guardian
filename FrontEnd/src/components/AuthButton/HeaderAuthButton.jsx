import styled from 'styled-components';
import { Button } from '../Button/button';
import { useNavigate } from 'react-router-dom';

const AuthButtonContainer = styled.div`
  position: absolute;
  top: 1.5rem; /* Меняем с 2rem на 1.5rem чтобы была на уровне заголовка */
  right: 3rem;
  z-index: 100;
`;

export function HeaderAuthButton() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleClick = () => {
    if (user) {
      localStorage.removeItem('user');
      localStorage.removeItem('hrg_chats');
      window.location.reload();
    } else {
      navigate('/login');
    }
  };

  return (
    <AuthButtonContainer>
      <Button 
        onClick={handleClick}
        style={{ height: '4rem', padding: '0 2rem' }}
        variant={user ? "danger" : ""}
      >
        {user ? 'Выйти' : 'Войти / Зарегистрироваться'}
      </Button>
    </AuthButtonContainer>
  );
}
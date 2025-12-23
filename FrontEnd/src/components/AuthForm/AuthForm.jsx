import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '../Button/button';
import { authService } from '../../services/authService';

const AuthContainer = styled.div`
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    var(--primary-black-1) 0%,
    var(--primary-black-3) 100%
  );
  border-radius: 15px;
  border: 1px solid var(--primasy-stroke-1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h1`
  font-size: 2.8rem;
  color: var(--primary-white-1);
  text-align: center;
  margin-bottom: 0.8rem;
  font-weight: 600;
`;

const Subtitle = styled.h2`
  font-size: 1.8rem;
  color: var(--primary-white-1);
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 500;
  opacity: 0.9;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 1.4rem;
  color: var(--primary-white-1);
  font-weight: 500;
`;

const AuthInput = styled.input`
  background-color: var(--primary-black-2);
  font-size: 1.4rem;
  border-radius: 10px;
  color: var(--primary-white-1);
  border: 1px solid var(--primasy-stroke-1);
  padding: 0 1.2rem;
  width: 100%;
  height: 4rem;
  transition: all 300ms ease-out;
  box-sizing: border-box;
  
  &:hover{
    background-color: var(--primary-black-3);
    border-color: rgba(219, 101, 75, 0.7);
  }
  
  &:focus{
    outline: none;
    border-color: var(--secondary-orange-1);
    background-color: var(--primary-black-3);
    box-shadow: 0 0 0 2px rgba(219, 101, 75, 0.2);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1.3rem;
  }
`;

const ErrorText = styled.p`
  color: var(--secondary-red-1);
  font-size: 1.3rem;
  text-align: center;
  margin-top: 0.5rem;
  min-height: 2rem;
  padding: 0 0.5rem;
`;

const LoadingText = styled.p`
  color: var(--secondary-orange-1);
  font-size: 1.3rem;
  text-align: center;
  margin-top: 0.5rem;
`;

const SwitchLink = styled.button`
  background: none;
  border: none;
  color: var(--primary-white-1);
  font-size: 1.4rem;
  text-align: center;
  margin-top: 1.2rem;
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.8;
  
  &:hover {
    opacity: 1;
    color: var(--secondary-orange-1);
  }
`;

export default function AuthForm({ isLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password) => password.length >= 6;
  const isLettersOnly = (value) => /^[а-яА-Яa-zA-Z]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    // Валидация для регистрации
    if (!isLogin) {
      if (!email || !password || !confirmPassword || !firstName || !lastName) {
        setError('Пожалуйста, заполните все поля');
        setLoading(false);
        return;
      }
  
      if (!isValidEmail(email)) {
        setError('Пожалуйста, введите корректный email');
        setLoading(false);
        return;
      }
  
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        setLoading(false);
        return;
      }
  
      if (!isValidPassword(password)) {
        setError('Пароль должен содержать минимум 6 символов');
        setLoading(false);
        return;
      }
  
      if (!isLettersOnly(firstName)) {
        setError('Имя должно содержать только буквы');
        setLoading(false);
        return;
      }
      if (!isLettersOnly(lastName)) {
        setError('Фамилия должна содержать только буквы');
        setLoading(false);
        return;
      }
    }
  
    // Валидация для входа
    if (isLogin) {
      if (!email || !password) {
        setError('Пожалуйста, заполните все поля');
        setLoading(false);
        return;
      }
  
      if (!isValidEmail(email)) {
        setError('Пожалуйста, введите корректный email');
        setLoading(false);
        return;
      }
  
      if (!isValidPassword(password)) {
        setError('Пароль должен содержать минимум 6 символов');
        setLoading(false);
        return;
      }
    }
  
    try {
      if (isLogin) {
        // Вход
        await authService.login(email, password);
        console.log('Login successful');
        navigate('/chat');
      } else {
        // Регистрация - генерируем username
        const generatedUsername = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
        
        const userData = {
          username: generatedUsername,
          email,
          password,
          firstName,
          lastName,
        };
        
        await authService.register(userData);
        console.log('Registration and auto-login successful');
        navigate('/chat');
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (error.response?.data?.email) {
        setError(`Пользователь с email ${email} уже существует`);
      } else if (error.response?.status === 400) {
        setError('Некорректные данные');
      } else if (error.response?.status === 401) {
        setError('Неверный email или пароль');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Не удалось подключиться к серверу. Проверьте запущен ли бэкенд.');
      } else {
        setError('Произошла ошибка. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = () => {
    navigate(isLogin ? '/register' : '/login');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthContainer>
      <Title>HR-Guardian</Title>
      <Subtitle>
        {isLogin ? 'Вход в систему' : 'Регистрация'}
      </Subtitle>

      <Form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <FormGroup>
              <Label>Имя</Label>
              <AuthInput
                type="text"
                placeholder="Введите имя"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setError('');
                }}
              />
            </FormGroup>

            <FormGroup>
              <Label>Фамилия</Label>
              <AuthInput
                type="text"
                placeholder="Введите фамилию"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setError('');
                }}
              />
            </FormGroup>

            <FormGroup>
              <Label>Email</Label>
              <AuthInput
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
              />
            </FormGroup>

            <FormGroup>
              <Label>Пароль</Label>
              <AuthInput
                type={showPassword ? "text" : "password"}
                placeholder="Не менее 6 символов"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
              <button 
                type="button"
                onClick={togglePasswordVisibility}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-white-1)',
                  fontSize: '1.2rem',
                  marginTop: '0.3rem',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                  opacity: 0.7
                }}
              >
                {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              </button>
            </FormGroup>

            <FormGroup>
              <Label>Подтвердите пароль</Label>
              <AuthInput
                type={showPassword ? "text" : "password"}
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
              />
            </FormGroup>
          </>
        )}

        {isLogin && (
          <>
            <FormGroup>
              <Label>Email</Label>
              <AuthInput
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
              />
            </FormGroup>

            <FormGroup>
              <Label>Пароль</Label>
              <AuthInput
                type={showPassword ? "text" : "password"}
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
              <button 
                type="button"
                onClick={togglePasswordVisibility}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-white-1)',
                  fontSize: '1.2rem',
                  marginTop: '0.3rem',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                  opacity: 0.7
                }}
              >
                {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              </button>
            </FormGroup>
          </>
        )}

        {error && <ErrorText>{error}</ErrorText>}
        {loading && <LoadingText>Загрузка...</LoadingText>}

        <Button 
          type="submit" 
          style={{ 
            height: '4.5rem', 
            width: '100%', 
            marginTop: '1.2rem', 
            fontSize: '1.6rem' 
          }}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
        </Button>

        <SwitchLink onClick={handleSwitch}>
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
        </SwitchLink>
      </Form>
    </AuthContainer>
  );
}
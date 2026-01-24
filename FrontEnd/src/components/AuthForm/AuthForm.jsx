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

const SuccessText = styled.p`
  color: #4caf50;
  font-size: 1.3rem;
  text-align: center;
  margin-top: 0.5rem;
  padding: 1rem;
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.3);
`;

const OptionalLabel = styled.span`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
  margin-left: 0.5rem;
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
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password) => password.length >= 6;
  const isLettersOnly = (value) => /^[а-яА-Яa-zA-Z]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Валидация для регистрации
    if (!isLogin) {
      if (!email || !password || !confirmPassword || !firstName || !lastName) {
        setError('Пожалуйста, заполните обязательные поля');
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
        await authService.login(email, password, rememberMe);
        navigate('/chat');
      } else {
        // Регистрация - username = email (оба уникальны, поле обязательное в БД)
        const userData = {
          username: email,
          email,
          password,
          firstName,
          lastName,
          position: position || null,
          department: department || null,
        };

        await authService.register(userData);
        // Показываем сообщение об успешной регистрации
        setSuccess('Регистрация успешна! Ожидайте подтверждения администратором.');
        // Очищаем форму
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
        setPosition('');
        setDepartment('');
      }
    } catch (error) {
      console.error('Auth error:', error);

      // authService бросает Error с message, axios бросает с response.data.detail
      const detail = error.response?.data?.detail || error.message;

      // Переводим ошибки бэкенда на русский
      const errorMessages = {
        'Email already registered': 'Пользователь с таким email уже зарегистрирован',
        'Invalid email or password': 'Неверный email или пароль',
        'Password must be at least 6 characters': 'Пароль должен быть не менее 6 символов',
        'Invalid email format': 'Некорректный формат email',
      };

      if (detail && errorMessages[detail]) {
        setError(errorMessages[detail]);
      } else if (detail && detail !== 'undefined') {
        // Показываем ошибку как есть (включая русские от бэкенда для pending/rejected аккаунтов)
        setError(detail);
      } else if (error.response?.status === 401) {
        setError('Неверный email или пароль');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Не удалось подключиться к серверу');
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

            <FormGroup>
              <Label>Должность<OptionalLabel>(необязательно)</OptionalLabel></Label>
              <AuthInput
                type="text"
                placeholder="Например: Менеджер по продажам"
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  setError('');
                }}
              />
            </FormGroup>

            <FormGroup>
              <Label>Отдел<OptionalLabel>(необязательно)</OptionalLabel></Label>
              <AuthInput
                type="text"
                placeholder="Например: Отдел продаж"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
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

            <FormGroup>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                color: 'var(--primary-white-1)',
                fontSize: '1.4rem',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '1.8rem',
                    height: '1.8rem',
                    cursor: 'pointer',
                    accentColor: 'var(--primary-blue-1)'
                  }}
                />
                <span>Запомнить меня</span>
              </label>
            </FormGroup>
          </>
        )}

        {error && <ErrorText>{error}</ErrorText>}
        {success && <SuccessText>{success}</SuccessText>}
        {loading && <LoadingText>Загрузка...</LoadingText>}

        {!success && (
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
        )}

        <SwitchLink onClick={handleSwitch}>
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
        </SwitchLink>
      </Form>
    </AuthContainer>
  );
}
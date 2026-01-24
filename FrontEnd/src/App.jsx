import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { MainPageContainer } from "./Pages/MainPage/MainPageContainer";
import { KnowledgeBasePageContainer } from "./Pages/KnowledgeBasePage/KnowledgeBasePageContainer";
import { QueryLogPageContainer } from "./Pages/QueryLogPage/QueryLogPageContainer";
import { UsersPageContainer } from "./Pages/UsersPage/UsersPageContainer";
import Login from "./Pages/Auth/Login";
import Register from "./Pages/Auth/Register";
import { authService } from "./services/authService";

// Хелпер для проверки токена напрямую из localStorage
function checkTokenValid() {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return false;
  }

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));

    const isValid = payload.exp && Date.now() < payload.exp * 1000;

    if (isValid) {
      return true;
    }

    // Токен истёк - очищаем
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return false;
  } catch (e) {
    // Некорректный токен - очищаем
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return false;
  }
}

// Защищённый маршрут - проверяет авторизацию
function PrivateRoute({ children, requiredRole }) {
  const isValid = checkTokenValid();

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  // Проверка роли если требуется
  if (requiredRole) {
    const user = authService.getCurrentUser();
    const hasAccess = requiredRole.includes(user?.role);
    if (!hasAccess) {
      return <Navigate to="/chat" replace />;
    }
  }

  return children;
}

// Публичный маршрут - для неавторизованных (login/register)
function PublicRoute({ children }) {
  const isValid = checkTokenValid();

  // Если токен валидный - редирект на чат
  if (isValid) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Корневой путь - редирект на чат или логин */}
        <Route path="/" element={
          <Navigate to={checkTokenValid() ? "/chat" : "/login"} replace />
        } />

        {/* Защищённые маршруты */}
        <Route path="/chat" element={
          <PrivateRoute><MainPageContainer /></PrivateRoute>
        } />
        <Route path="/chat/:chatId" element={
          <PrivateRoute><MainPageContainer /></PrivateRoute>
        } />
        <Route path="/knowledge-base" element={
          <PrivateRoute requiredRole={['hr', 'admin']}>
            <KnowledgeBasePageContainer />
          </PrivateRoute>
        } />
        <Route path="/query-log" element={
          <PrivateRoute requiredRole={['hr', 'admin']}>
            <QueryLogPageContainer />
          </PrivateRoute>
        } />
        <Route path="/users" element={
          <PrivateRoute requiredRole={['hr', 'admin']}>
            <UsersPageContainer />
          </PrivateRoute>
        } />

        {/* Публичные маршруты */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute><Register /></PublicRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
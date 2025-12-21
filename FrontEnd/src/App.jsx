import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
//import  { MainPage }  from "./Pages/MainPage/MainPage.jsx";
import { MainPageContainer } from "./Pages/MainPage/MainPageContainer";
import { KnowledgeBasePageContainer } from "./Pages/KnowledgeBasePage/KnowledgeBasePageContainer";
import { QueryLogPageContainer } from "./Pages/QueryLogPage/QueryLogPageContainer";
import Login from "./Pages/Auth/Login";
import Register from "./Pages/Auth/Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<MainPageContainer />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePageContainer />} />
        <Route path="/query-log" element={<QueryLogPageContainer />} /> 
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

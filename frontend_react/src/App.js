import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from './components/LoginPage';
import Signup from './components/Signup';
import Home from './components/Home';
import SharedAcceptPage from './components/SharedAcceptPage';
import FilePreview from './components/FilePreview';
import FileEditor from './components/FileEditor';

const App = () => {
  return (
    <Router>
      {/* ✅ Toast 메시지 컨테이너 */}
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} />

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/shared/:url" element={<SharedAcceptPage />} />

        <Route path="/preview" element={<FilePreview />} />
        <Route path="/edit" element={<FileEditor />} />

        {/* 항상 마지막에 와야 함 */}
        <Route path="*" element={<LoginPage />} />

      </Routes>
    </Router>
  );
};

export default App;
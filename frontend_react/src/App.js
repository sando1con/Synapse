import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './components/LoginPage';
import Signup from './components/Signup';
import Home from './components/Home'; // 추가
import SharedAcceptPage from './components/SharedAcceptPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="*" element={<LoginPage />} />
        <Route path="/shared/:url" element={<SharedAcceptPage />} />
      </Routes>
    </Router>
  );
};

export default App;

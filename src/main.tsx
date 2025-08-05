import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { MobileUpload } from './components/Mobile/MobileUpload.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/mobile-upload" element={<MobileUpload />} />
        <Route path="/mobile-upload/:sessionId" element={<MobileUpload />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Router>
  </StrictMode>
);

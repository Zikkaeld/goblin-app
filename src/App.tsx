import { Route, Routes } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import ProfileGate from './components/ProfileGate';
import MainApp from './pages/MainApp';
import JoinRoomPage from './pages/JoinRoomPage';
import ResultPage from './pages/ResultPage';

function AuthedApp() {
  return (
    <ProfileGate>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="join/:code" element={<JoinRoomPage />} />
      </Routes>
    </ProfileGate>
  );
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/result/:rollId" element={<ResultPage />} />
        <Route path="/*" element={<AuthedApp />} />
      </Routes>
      <Analytics />
    </>
  );
}

export default App;

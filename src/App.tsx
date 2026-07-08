import { Route, Routes } from 'react-router-dom';
import './App.css';
import ProfileGate from './components/ProfileGate';
import MainApp from './pages/MainApp';
import JoinRoomPage from './pages/JoinRoomPage';

function App() {
  return (
    <ProfileGate>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/join/:code" element={<JoinRoomPage />} />
      </Routes>
    </ProfileGate>
  );
}

export default App;

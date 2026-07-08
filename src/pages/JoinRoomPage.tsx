import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { fetchRoomByInviteCode, joinRoom } from '../lib/rooms';
import type { DbRoomRow } from '../lib/rooms';
import { THEME_MAP } from '../data';

type Status = 'loading' | 'not-found' | 'ready' | 'joining' | 'error';

export default function JoinRoomPage() {
  const { code } = useParams<{ code: string }>();
  const profile = useProfile();
  const navigate = useNavigate();
  const [room, setRoom] = useState<DbRoomRow | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!code) return;
    setStatus('loading');
    fetchRoomByInviteCode(code)
      .then((r) => {
        if (!r) {
          setStatus('not-found');
          return;
        }
        setRoom(r);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [code]);

  async function handleJoin() {
    if (!room) return;
    setStatus('joining');
    try {
      await joinRoom(profile.id, room.id);
      navigate('/', { state: { openRoomId: room.id } });
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="app">
      <div className="view" style={{ maxWidth: 360, margin: '80px auto 0' }}>
        {status === 'loading' && <p className="panel__hint">Шукаємо кімнату…</p>}
        {status === 'not-found' && <p className="panel__hint">Кімнату не знайдено. Перевір лінк.</p>}
        {status === 'error' && <p className="panel__hint">Щось пішло не так. Спробуй ще раз.</p>}

        {room && (status === 'ready' || status === 'joining') && (
          <div className="panel" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 44 }}>{THEME_MAP[room.theme_id].emoji}</span>
            <h2 className="panel__title">{room.name}</h2>
            <p className="panel__hint">Тема: {THEME_MAP[room.theme_id].label}</p>
            <button
              type="button"
              className="btn btn--roll"
              onClick={handleJoin}
              disabled={status === 'joining'}
            >
              {status === 'joining' ? 'Приєднуємось…' : 'Приєднатись'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

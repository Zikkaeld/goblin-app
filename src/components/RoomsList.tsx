import { useState } from 'react';
import RoomCard from './RoomCard';
import CreateRoomModal from './CreateRoomModal';
import type { Room, ThemeId } from '../types';

interface RoomsListProps {
  rooms: Room[];
  loading: boolean;
  currentProfileId: string;
  onOpenRoom: (roomId: string) => void;
  onCreateRoom: (name: string, themeId: ThemeId) => Promise<void>;
}

export default function RoomsList({ rooms, loading, currentProfileId, onOpenRoom, onCreateRoom }: RoomsListProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="view">
      <h2 className="view__title">Твої кімнати 🏡</h2>
      <p className="view__subtitle">Обери кімнату, щоб кинути сьогоднішній кубик разом з друзями</p>

      <button
        type="button"
        className="btn btn--primary"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => setShowCreate(true)}
      >
        ➕ Створити кімнату
      </button>

      {loading && <p className="panel__hint">Завантажуємо кімнати…</p>}
      {!loading && rooms.length === 0 && <p className="panel__hint">У тебе ще немає кімнат. Створи першу!</p>}

      <div className="rooms-grid">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            currentProfileId={currentProfileId}
            onOpen={() => onOpenRoom(room.id)}
          />
        ))}
      </div>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onSubmit={onCreateRoom} />}
    </div>
  );
}

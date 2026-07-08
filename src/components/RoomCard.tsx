import { THEME_MAP } from '../data';
import type { Room } from '../types';

interface RoomCardProps {
  room: Room;
  currentProfileId: string;
  onOpen: () => void;
}

export default function RoomCard({ room, currentProfileId, onOpen }: RoomCardProps) {
  const theme = THEME_MAP[room.themeId];
  const meRolled = room.rolledTodayMemberIds.includes(currentProfileId);
  const doneCount = room.rolledTodayMemberIds.length;
  const displayIcon = room.icon ?? theme.emoji;

  return (
    <button type="button" className="room-card" style={{ background: theme.gradient }} onClick={onOpen}>
      <div className="room-card__top">
        <span className="room-card__emoji">{displayIcon}</span>
        <span className="room-card__streak">🔥 {room.streak}</span>
      </div>
      <div className="room-card__name">{room.name}</div>
      <div className="room-card__meta">
        <span>{theme.label}</span>
        <span>
          {doneCount}/{room.members.length} кинули сьогодні
        </span>
      </div>
      {!meRolled && <div className="room-card__badge">Твоя черга! 🎲</div>}
    </button>
  );
}

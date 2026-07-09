import { useState } from 'react';
import { RARITY_MAP, THEME_MAP } from '../data';
import { rollsRemaining } from '../types';
import type { Room, RollLimitState, RollResult, ThemeId } from '../types';
import MembersList from './MembersList';
import RollControls from './RollControls';
import ResultCard from './ResultCard';
import ShareButton from './ShareButton';
import EditRoomModal from './EditRoomModal';

interface RoomViewProps {
  room: Room;
  currentProfileId: string;
  rollState: RollLimitState;
  lastResult: RollResult | null;
  onRoll: () => void;
  onWatchAd: (reward: 1 | 3) => void;
  onBack: () => void;
  onShare: (message: string) => void;
  onChangeTheme: (themeId: ThemeId) => void;
  onUpdateRoomDetails: (name: string, icon: string) => Promise<void>;
  onRemoveMember: (profileId: string) => Promise<void>;
  onDeleteRoom: () => Promise<void>;
  onRecoverStreak: () => void;
  onToggleReaction: (rollId: string, emoji: string) => void;
  justCompletedStreak: boolean;
  newlyArrivedMemberIds: string[];
}

export default function RoomView({
  room,
  currentProfileId,
  rollState,
  lastResult,
  onRoll,
  onWatchAd,
  onBack,
  onShare,
  onChangeTheme,
  onUpdateRoomDetails,
  onRemoveMember,
  onDeleteRoom,
  onRecoverStreak,
  onToggleReaction,
  justCompletedStreak,
  newlyArrivedMemberIds,
}: RoomViewProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const theme = THEME_MAP[room.themeId];
  const remaining = rollsRemaining(rollState);
  const meRolled = room.rolledTodayMemberIds.includes(currentProfileId);
  const allRolledToday = room.rolledTodayMemberIds.length === room.members.length;
  const waitingFor = room.members.filter(
    (m) => !room.rolledTodayMemberIds.includes(m.id) && m.id !== currentProfileId
  );
  const isOwner = room.ownerId === currentProfileId;
  const joinUrl = `${window.location.origin}/join/${room.inviteCode}`;
  const displayIcon = room.icon ?? theme.emoji;

  return (
    <div className="view">
      <div className="room-view__topbar">
        <button type="button" className="btn btn--back" onClick={onBack}>
          ← Усі кімнати
        </button>
        {isOwner && (
          <button type="button" className="btn btn--ghost" onClick={() => setShowEditModal(true)}>
            ⚙️ Редагувати кімнату
          </button>
        )}
      </div>

      <div className="room-hero" style={{ background: theme.gradient }}>
        <div className="room-hero__left">
          <span className="room-hero__emoji">{displayIcon}</span>
          <div>
            <h2 className="room-hero__name">{room.name}</h2>
            <span className="room-hero__theme">Тема: {theme.label}</span>
          </div>
        </div>
        <div className={`room-hero__streak ${allRolledToday ? 'room-hero__streak--lit' : ''}`}>
          <span className="room-hero__streak-icon">🔥</span>
          <span className="room-hero__streak-number">{room.streak}</span>
        </div>
      </div>

      {showEditModal && (
        <EditRoomModal
          room={room}
          onClose={() => setShowEditModal(false)}
          onSave={onUpdateRoomDetails}
          onRemoveMember={onRemoveMember}
          onDeleteRoom={async () => {
            await onDeleteRoom();
            onBack();
          }}
          themeId={room.themeId}
          onChangeTheme={onChangeTheme}
        />
      )}

      {justCompletedStreak && (
        <div className="streak-toast">🔥 Вогник кімнати зріс до {room.streak}! Усі кинули кубик сьогодні!</div>
      )}

      {room.brokenStreakValue !== null && (
        <div className="streak-recover-banner">
          <p>
            Вогник згас 😢 Був стрік {room.brokenStreakValue} {room.brokenStreakValue === 1 ? 'день' : 'днів'}.
            Відновити?
          </p>
          <button type="button" className="btn btn--ad" onClick={onRecoverStreak}>
            📺 Дивитись рекламу і відновити
          </button>
        </div>
      )}

      <div className="panel">
        <h3 className="panel__title">Учасники</h3>
        <MembersList
          members={room.members}
          newlyArrivedMemberIds={newlyArrivedMemberIds}
          onToggleReaction={onToggleReaction}
        />
        {!allRolledToday && waitingFor.length > 0 && (
          <p className="panel__hint">Ще чекаємо на: {waitingFor.map((m) => m.name).join(', ')}</p>
        )}
      </div>

      <div className="panel panel--roll">
        <h3 className="panel__title">{meRolled ? 'Твій сьогоднішній результат' : 'Твоя черга кидати!'}</h3>
        {lastResult && <ResultCard result={lastResult} />}
        <RollControls
          remaining={remaining}
          extra={rollState.extra}
          onRoll={onRoll}
          onRequestAd={onWatchAd}
          rollLabel={meRolled ? 'Кинути ще раз' : 'Кинути кубик'}
        />
        {lastResult && (
          <ShareButton
            text={`Я сьогодні — ${lastResult.title} ${lastResult.emoji} (${RARITY_MAP[lastResult.rarity].label.toLowerCase()}) у кімнаті «${room.name}»! А ти хто сьогодні? 🎲`}
            rollId={lastResult.rollId}
            onShared={onShare}
            imageCard={{
              title: lastResult.title,
              emoji: lastResult.emoji,
              rarity: lastResult.rarity,
              themeLabel: theme.label,
              themeEmoji: theme.emoji,
              roomName: room.name,
            }}
          />
        )}
      </div>

      <div className="panel">
        <h3 className="panel__title">Запросити друзів</h3>
        <p className="panel__hint">Код запрошення: {room.inviteCode}</p>
        <ShareButton text={joinUrl} label="🔗 Поділитися кімнатою" onShared={onShare} />
      </div>
    </div>
  );
}

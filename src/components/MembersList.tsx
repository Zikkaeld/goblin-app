import { RARITY_MAP } from '../data';
import ReactionBar from './ReactionBar';
import type { Member } from '../types';

interface MembersListProps {
  members: Member[];
  newlyArrivedMemberIds?: string[];
  onToggleReaction: (rollId: string, emoji: string) => void;
}

export default function MembersList({ members, newlyArrivedMemberIds = [], onToggleReaction }: MembersListProps) {
  return (
    <div className="member-status-list">
      {members.map((m) => {
        const isNewlyArrived = newlyArrivedMemberIds.includes(m.id);
        const result = m.todayResult;
        const rarity = result ? RARITY_MAP[result.rarity] : null;

        return (
          <div
            key={m.id}
            className={`member-status ${result ? 'member-status--done' : 'member-status--pending'} ${isNewlyArrived ? 'member-status--new' : ''}`}
            style={rarity ? { borderColor: rarity.color } : undefined}
          >
            <div className="member-status__row">
              <span className="member-status__avatar">{m.avatar}</span>
              <div className="member-status__info">
                <span className="member-status__name">
                  {m.name}
                  {m.isCurrentUser ? ' (ти)' : ''}
                </span>
                {result ? (
                  <span className="member-status__result">
                    <span className="member-status__result-emoji">{result.emoji}</span>
                    <span className="member-status__result-title">{result.title}</span>
                  </span>
                ) : (
                  <span className="member-status__pending-text">⏳ ще не кидав сьогодні</span>
                )}
              </div>
              {rarity && (
                <span className="member-status__rarity" style={{ color: rarity.color }}>
                  {rarity.label}
                </span>
              )}
            </div>
            {result && (
              <ReactionBar
                reactions={result.reactions}
                canReact={!m.isCurrentUser}
                onToggle={(emoji) => onToggleReaction(result.rollId, emoji)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

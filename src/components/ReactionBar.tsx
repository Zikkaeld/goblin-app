import { REACTION_EMOJIS } from '../lib/reactions';
import type { ReactionSummary } from '../types';

interface ReactionBarProps {
  reactions: ReactionSummary[];
  canReact: boolean;
  onToggle: (emoji: string) => void;
}

export default function ReactionBar({ reactions, canReact, onToggle }: ReactionBarProps) {
  if (!canReact && reactions.length === 0) return null;

  return (
    <div className="reaction-bar">
      {canReact && (
        <div className="reaction-bar__picker">
          {REACTION_EMOJIS.map((emoji) => {
            const mine = reactions.find((r) => r.emoji === emoji)?.reactedByMe ?? false;
            return (
              <button
                key={emoji}
                type="button"
                className={`reaction-option ${mine ? 'reaction-option--active' : ''}`}
                onClick={() => onToggle(emoji)}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
      {reactions.length > 0 && (
        <div className="reaction-bar__counts">
          {reactions.map((r) => (
            <span key={r.emoji} className={`reaction-count ${r.reactedByMe ? 'reaction-count--mine' : ''}`}>
              {r.emoji} {r.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

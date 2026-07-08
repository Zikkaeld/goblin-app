import { FREE_ROLLS_PER_DAY } from '../types';

interface RollControlsProps {
  remaining: number;
  extra: number;
  onRoll: () => void;
  onRequestAd: (reward: 1 | 3) => void;
  rollLabel?: string;
}

export default function RollControls({ remaining, extra, onRoll, onRequestAd, rollLabel }: RollControlsProps) {
  const totalAllowed = FREE_ROLLS_PER_DAY + extra;

  if (remaining > 0) {
    return (
      <div className="roll-controls">
        <button type="button" className="btn btn--roll" onClick={onRoll}>
          🎲 {rollLabel ?? 'Кинути кубик'}
        </button>
        <span className="roll-controls__counter">
          Залишилось {remaining} з {totalAllowed} сьогодні
        </span>
      </div>
    );
  }

  return (
    <div className="roll-controls roll-controls--empty">
      <p className="roll-controls__empty-text">Кидки на сьогодні скінчились 😢</p>
      <div className="roll-controls__ads">
        <button type="button" className="btn btn--ad" onClick={() => onRequestAd(1)}>
          📺 Реклама за +1 кидок
        </button>
        <button type="button" className="btn btn--ad" onClick={() => onRequestAd(3)}>
          📺 Реклама за +3 кидки
        </button>
      </div>
    </div>
  );
}

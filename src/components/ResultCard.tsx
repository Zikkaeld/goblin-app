import { RARITY_MAP } from '../data';
import type { RollResult } from '../types';

interface ResultCardProps {
  result: RollResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const rarity = RARITY_MAP[result.rarity];

  return (
    <div
      className={`result-card rarity-${result.rarity}`}
      style={{ borderColor: rarity.color, boxShadow: rarity.glow }}
    >
      <span className="result-card__rarity" style={{ color: rarity.color }}>
        {rarity.label}
      </span>
      <div className="result-card__emoji">{result.emoji}</div>
      <div className="result-card__title">{result.title}</div>
      <div className="result-card__flavor">{result.flavor}</div>
    </div>
  );
}

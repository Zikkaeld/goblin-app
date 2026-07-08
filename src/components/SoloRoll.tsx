import { RARITY_MAP, THEME_MAP } from '../data';
import { rollsRemaining } from '../types';
import type { RollLimitState, RollResult, ThemeId } from '../types';
import ThemePicker from './ThemePicker';
import RollControls from './RollControls';
import ResultCard from './ResultCard';
import ShareButton from './ShareButton';

interface SoloRollProps {
  themeId: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  rollState: RollLimitState;
  lastResult: RollResult | null;
  onRoll: () => void;
  onWatchAd: (reward: 1 | 3) => void;
  onShare: (message: string) => void;
}

export default function SoloRoll({
  themeId,
  onThemeChange,
  rollState,
  lastResult,
  onRoll,
  onWatchAd,
  onShare,
}: SoloRollProps) {
  const theme = THEME_MAP[themeId];
  const remaining = rollsRemaining(rollState);

  return (
    <div className="view">
      <h2 className="view__title">Соло-ролл 🎲</h2>
      <p className="view__subtitle">
        Кидай кубик сам, без кімнати й учасників — обери будь-яку тему. Ці кидки не рахуються в жоден спільний вогник.
      </p>

      <div className="panel">
        <h3 className="panel__title">Обери тему</h3>
        <ThemePicker value={themeId} onChange={onThemeChange} />
      </div>

      <div className="panel panel--roll" style={{ background: theme.gradient }}>
        <h3 className="panel__title panel__title--light">{theme.emoji} {theme.label}</h3>
        {lastResult && <ResultCard result={lastResult} />}
        <RollControls
          remaining={remaining}
          extra={rollState.extra}
          onRoll={onRoll}
          onRequestAd={onWatchAd}
          rollLabel={lastResult ? 'Кинути ще' : 'Кинути кубик'}
        />
        {lastResult && (
          <ShareButton
            text={`Соло-ролл: я сьогодні — ${lastResult.title} ${lastResult.emoji} (${RARITY_MAP[lastResult.rarity].label.toLowerCase()}) у темі «${theme.label}»! 🎲`}
            onShared={onShare}
          />
        )}
      </div>
    </div>
  );
}

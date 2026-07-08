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
  completedThemeIds: ThemeId[];
  streak: number;
  history: RollResult[];
}

export default function SoloRoll({
  themeId,
  onThemeChange,
  rollState,
  lastResult,
  onRoll,
  onWatchAd,
  onShare,
  completedThemeIds,
  streak,
  history,
}: SoloRollProps) {
  const theme = THEME_MAP[themeId];
  const remaining = rollsRemaining(rollState);
  const questDone = completedThemeIds.length >= 4;
  const placeholders = Math.max(0, 4 - completedThemeIds.length);

  return (
    <div className="view">
      <div className="view__header-row">
        <h2 className="view__title">Соло-ролл 🎲</h2>
        <div className={`solo-streak-badge ${questDone ? 'solo-streak-badge--lit' : ''}`}>🔥 {streak}</div>
      </div>
      <p className="view__subtitle">
        Кидай кубик сам, без кімнати й учасників — обери будь-яку тему. Ці кидки не рахуються в жоден спільний вогник.
      </p>

      <div className="panel">
        <h3 className="panel__title">
          Денний квест: {Math.min(completedThemeIds.length, 4)}/4 тем
        </h3>
        <div className="quest-chips">
          {completedThemeIds.map((id) => {
            const t = THEME_MAP[id];
            return (
              <span key={id} className="quest-chip quest-chip--done">
                ✅ {t.emoji} {t.label}
              </span>
            );
          })}
          {Array.from({ length: placeholders }).map((_, i) => (
            <span key={`empty-${i}`} className="quest-chip quest-chip--pending">
              ❔ ще тема
            </span>
          ))}
        </div>
        {questDone && <p className="panel__hint">Квест виконано сьогодні! 🎉</p>}
      </div>

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

      {history.length > 0 && (
        <div className="panel">
          <h3 className="panel__title">Сьогодні вже кидав:</h3>
          <div className="solo-history-list">
            {history.map((entry) => {
              const rarity = RARITY_MAP[entry.rarity];
              const entryTheme = THEME_MAP[entry.themeId];
              return (
                <div key={entry.resultId} className="solo-history-row" style={{ borderColor: rarity.color }}>
                  <span className="solo-history-row__theme-emoji">{entryTheme.emoji}</span>
                  <span className="solo-history-row__result-emoji">{entry.emoji}</span>
                  <span className="solo-history-row__title">{entry.title}</span>
                  <span className="solo-history-row__rarity" style={{ color: rarity.color }}>
                    {rarity.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

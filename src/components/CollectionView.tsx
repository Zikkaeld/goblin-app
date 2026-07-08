import { useEffect, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { RARITY_MAP, RESULT_POOLS } from '../data';
import { fetchCollectedResults } from '../lib/rolls';
import type { CollectedResult } from '../lib/rolls';
import type { ThemeId } from '../types';
import ThemePicker from './ThemePicker';

export default function CollectionView() {
  const profile = useProfile();
  const [themeId, setThemeId] = useState<ThemeId>('goblin');
  const [collected, setCollected] = useState<CollectedResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCollectedResults(profile.id)
      .then((data) => {
        if (!cancelled) setCollected(data);
      })
      .catch(() => {
        if (!cancelled) setCollected([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const collectedTitles = new Set(
    collected.filter((c) => c.themeId === themeId).map((c) => c.title)
  );
  const pool = RESULT_POOLS[themeId];
  const collectedCount = pool.filter((seed) => collectedTitles.has(seed.title)).length;
  const total = pool.length;
  const progressPercent = total > 0 ? Math.round((collectedCount / total) * 100) : 0;

  return (
    <div className="view">
      <h2 className="view__title">Колекція результатів 🏆</h2>
      <p className="view__subtitle">Збирай усі можливі результати кожної теми</p>

      <div className="panel">
        <h3 className="panel__title">Тема</h3>
        <ThemePicker value={themeId} onChange={setThemeId} />
      </div>

      <div className="panel">
        <div className="collection-progress">
          <span className="collection-progress__label">
            Зібрано {collectedCount} з {total}
          </span>
          <div className="collection-progress__bar">
            <div className="collection-progress__fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="panel__hint">Завантажуємо колекцію…</p>
      ) : (
        <div className="collection-grid">
          {pool.map((seed) => {
            const isCollected = collectedTitles.has(seed.title);
            const rarity = RARITY_MAP[seed.rarity];

            if (isCollected) {
              return (
                <div
                  key={seed.title}
                  className="collection-card"
                  style={{ borderColor: rarity.color, boxShadow: rarity.glow }}
                >
                  <span className="collection-card__rarity" style={{ color: rarity.color }}>
                    {rarity.label}
                  </span>
                  <div className="collection-card__emoji">{seed.emoji}</div>
                  <div className="collection-card__title">{seed.title}</div>
                </div>
              );
            }

            return (
              <div key={seed.title} className="collection-card collection-card--locked">
                <span className="collection-card__rarity collection-card__rarity--hint">{rarity.label}</span>
                <div className="collection-card__emoji collection-card__emoji--locked">?</div>
                <div className="collection-card__title collection-card__title--locked">???</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

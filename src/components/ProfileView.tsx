import { useEffect, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { fetchProfileStats } from '../lib/profile';
import type { ProfileStats } from '../lib/profile';
import { RARITIES, THEME_MAP } from '../data';

function formatJoinDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ProfileView() {
  const profile = useProfile();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProfileStats(profile.id)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  if (loading) {
    return (
      <div className="view">
        <h2 className="view__title">Профіль 👤</h2>
        <p className="panel__hint">Завантажуємо статистику…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="view">
        <h2 className="view__title">Профіль 👤</h2>
        <p className="panel__hint">Не вдалося завантажити статистику 😢</p>
      </div>
    );
  }

  const favoriteTheme = stats.favoriteThemeId ? THEME_MAP[stats.favoriteThemeId] : null;
  const maxRarityCount = Math.max(1, ...RARITIES.map((r) => stats.rarityCounts[r.id]));

  return (
    <div className="view">
      <h2 className="view__title">Профіль 👤</h2>
      <p className="view__subtitle">{profile.nickname}</p>

      <div className="panel">
        <h3 className="panel__title">Загальна інформація</h3>
        <p className="panel__hint">На платформі з {formatJoinDate(stats.createdAt)}</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__value">{stats.totalRolls}</span>
          <span className="stat-card__label">🎲 Усього кидків</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{stats.roomsCount}</span>
          <span className="stat-card__label">🏡 Кімнат</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{stats.soloStreak}</span>
          <span className="stat-card__label">🔥 Соло-стрік</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{stats.longestRoomStreak}</span>
          <span className="stat-card__label">🏆 Найдовший стрік кімнати</span>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel__title">Розподіл за рідкістю</h3>
        <div className="rarity-breakdown">
          {RARITIES.map((rarity) => {
            const count = stats.rarityCounts[rarity.id];
            const percent = Math.round((count / maxRarityCount) * 100);
            return (
              <div key={rarity.id} className="rarity-breakdown__row">
                <span className="rarity-breakdown__label" style={{ color: rarity.color }}>
                  {rarity.label}
                </span>
                <div className="rarity-breakdown__bar">
                  <div
                    className="rarity-breakdown__fill"
                    style={{ width: `${percent}%`, background: rarity.color }}
                  />
                </div>
                <span className="rarity-breakdown__count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel__title">Улюблена тема</h3>
        {favoriteTheme ? (
          <p className="panel__hint">
            {favoriteTheme.emoji} {favoriteTheme.label} — {stats.favoriteThemeCount}{' '}
            {stats.favoriteThemeCount === 1 ? 'кидок' : 'кидків'}
          </p>
        ) : (
          <p className="panel__hint">Ще не було жодного кидка</p>
        )}
      </div>
    </div>
  );
}

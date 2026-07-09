import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RARITY_MAP, THEME_MAP, findFlavorByTitle } from '../data';
import { fetchRollById } from '../lib/rolls';
import type { PublicRollResult } from '../lib/rolls';

type Status = 'loading' | 'not-found' | 'ready' | 'error';

export default function ResultPage() {
  const { rollId } = useParams<{ rollId: string }>();
  const [roll, setRoll] = useState<PublicRollResult | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!rollId) {
      setStatus('not-found');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetchRollById(rollId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setStatus('not-found');
          return;
        }
        setRoll(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [rollId]);

  const rarity = roll ? RARITY_MAP[roll.rarity] : null;
  const theme = roll?.themeId ? THEME_MAP[roll.themeId] : null;

  return (
    <div className="app">
      <div className="view" style={{ maxWidth: 360, margin: '80px auto 0' }}>
        <h1 className="app-header__title" style={{ textAlign: 'center' }}>
          🎲 Хто ти сьогодні?
        </h1>

        {status === 'loading' && <p className="panel__hint" style={{ textAlign: 'center' }}>Завантажуємо результат…</p>}
        {status === 'not-found' && (
          <p className="panel__hint" style={{ textAlign: 'center' }}>Результат не знайдено 😢</p>
        )}
        {status === 'error' && (
          <p className="panel__hint" style={{ textAlign: 'center' }}>Щось пішло не так. Спробуй пізніше.</p>
        )}

        {roll && rarity && status === 'ready' && (
          <div className="panel panel--roll" style={theme ? { background: theme.gradient } : undefined}>
            <h3 className="panel__title panel__title--light">{roll.nickname} сьогодні —</h3>
            <div className={`result-card rarity-${roll.rarity}`} style={{ borderColor: rarity.color, boxShadow: rarity.glow }}>
              <span className="result-card__rarity" style={{ color: rarity.color }}>
                {rarity.label}
              </span>
              <div className="result-card__emoji">{roll.emoji}</div>
              <div className="result-card__title">{roll.title}</div>
              {theme && (
                <div className="result-card__flavor">{findFlavorByTitle(theme.id, roll.title)}</div>
              )}
            </div>
            {theme && <p className="panel__hint panel__title--light">Тема: {theme.label}</p>}
          </div>
        )}

        <Link to="/" className="btn btn--roll result-page__cta">
          🎲 Спробувати самому
        </Link>
      </div>
    </div>
  );
}

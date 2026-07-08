import { useState } from 'react';
import type { FormEvent } from 'react';
import { createProfile } from '../lib/profile';
import type { Profile } from '../lib/profile';

interface NicknameFormProps {
  onCreated: (profile: Profile) => void;
}

export default function NicknameForm({ onCreated }: NicknameFormProps) {
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const profile = await createProfile(trimmed);
      onCreated(profile);
    } catch {
      setError('Не вдалося створити профіль. Спробуй ще раз.');
      setSubmitting(false);
    }
  }

  return (
    <div className="app">
      <div className="view" style={{ maxWidth: 360, margin: '80px auto 0' }}>
        <div className="panel" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: 44 }}>🎲</span>
          <h2 className="panel__title">Як тебе звати?</h2>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', alignItems: 'center' }}
          >
            <input
              className="text-input"
              placeholder="Твоє ім'я"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
              autoFocus
            />
            {error && <p className="panel__hint">{error}</p>}
            <button type="submit" className="btn btn--roll" disabled={submitting || !nickname.trim()}>
              {submitting ? 'Хвилинку…' : 'Продовжити'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

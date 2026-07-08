import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ThemeId } from '../types';
import ThemePicker from './ThemePicker';

interface CreateRoomModalProps {
  onClose: () => void;
  onSubmit: (name: string, themeId: ThemeId) => Promise<void>;
}

export default function CreateRoomModal({ onClose, onSubmit }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [themeId, setThemeId] = useState<ThemeId>('goblin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed, themeId);
      onClose();
    } catch {
      setError('Не вдалося створити кімнату. Спробуй ще раз.');
      setSubmitting(false);
    }
  }

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="panel__title">Нова кімната</h3>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', alignItems: 'center' }}
        >
          <input
            className="text-input"
            placeholder="Назва кімнати"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <ThemePicker value={themeId} onChange={setThemeId} />
          {error && <p className="panel__hint">{error}</p>}
          <button type="submit" className="btn btn--primary" disabled={submitting || !name.trim()}>
            {submitting ? 'Створюємо…' : 'Створити кімнату'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Скасувати
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ROOM_ICONS } from '../data';
import type { Room, ThemeId } from '../types';
import ThemePicker from './ThemePicker';

interface EditRoomModalProps {
  room: Room;
  onClose: () => void;
  onSave: (name: string, icon: string) => Promise<void>;
  onRemoveMember: (profileId: string) => Promise<void>;
  onDeleteRoom: () => Promise<void>;
  themeId: ThemeId;
  onChangeTheme: (themeId: ThemeId) => void;
}

export default function EditRoomModal({
  room,
  onClose,
  onSave,
  onRemoveMember,
  onDeleteRoom,
  themeId,
  onChangeTheme,
}: EditRoomModalProps) {
  const [name, setName] = useState(room.name);
  const [icon, setIcon] = useState(room.icon ?? ROOM_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await onSave(trimmed, icon);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Не вдалося зберегти зміни. Спробуй ще раз.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!window.confirm(`Видалити ${memberName} з кімнати?`)) return;
    setMemberError(null);
    setRemovingId(memberId);
    try {
      await onRemoveMember(memberId);
    } catch {
      setMemberError('Не вдалося видалити учасника. Спробуй ще раз.');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteRoom();
    } catch {
      setDeleteError('Не вдалося видалити кімнату. Спробуй ще раз.');
      setDeleting(false);
    }
  }

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal edit-room-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="panel__title">⚙️ Редагувати кімнату</h3>

        <form onSubmit={handleSave} className="edit-room-modal__section">
          <input
            className="text-input"
            placeholder="Назва кімнати"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />

          <div className="icon-grid">
            {ROOM_ICONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`icon-option ${icon === option ? 'icon-option--active' : ''}`}
                onClick={() => setIcon(option)}
              >
                {option}
              </button>
            ))}
          </div>

          {saveError && <p className="panel__hint">{saveError}</p>}

          <button type="submit" className="btn btn--primary" disabled={saving || !name.trim()}>
            {saving ? 'Зберігаємо…' : saved ? '✓ Збережено' : 'Зберегти зміни'}
          </button>
        </form>

        <div className="edit-room-modal__section">
          <h4 className="panel__title">Тематика кімнати</h4>
          <ThemePicker value={themeId} onChange={onChangeTheme} />
        </div>

        <div className="edit-room-modal__section">
          <h4 className="panel__title">Учасники</h4>
          <div className="edit-room-modal__members">
            {room.members.map((m) => (
              <div key={m.id} className="member-row">
                <span className="member-row__avatar">{m.avatar}</span>
                <span className="member-row__name">
                  {m.name}
                  {m.id === room.ownerId ? ' (власник)' : ''}
                </span>
                {m.id !== room.ownerId && (
                  <button
                    type="button"
                    className="btn btn--remove"
                    onClick={() => handleRemoveMember(m.id, m.name)}
                    disabled={removingId === m.id}
                  >
                    {removingId === m.id ? '…' : '✕ Видалити'}
                  </button>
                )}
              </div>
            ))}
          </div>
          {memberError && <p className="panel__hint">{memberError}</p>}
        </div>

        <div className="edit-room-modal__section danger-zone">
          {!confirmingDelete && (
            <button type="button" className="btn btn--danger" onClick={() => setConfirmingDelete(true)}>
              🗑️ Видалити кімнату назавжди
            </button>
          )}

          {confirmingDelete && (
            <div className="danger-confirm">
              <p>Видалити кімнату назавжди? Це видалить усіх учасників та історію кидків. Скасувати не можна.</p>
              {deleteError && <p className="panel__hint">{deleteError}</p>}
              <div className="danger-confirm__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                >
                  Скасувати
                </button>
                <button type="button" className="btn btn--danger" onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? 'Видаляємо…' : 'Так, видалити'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Закрити
        </button>
      </div>
    </div>
  );
}

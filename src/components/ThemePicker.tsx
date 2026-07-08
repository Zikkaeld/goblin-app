import { THEMES } from '../data';
import type { ThemeId } from '../types';

interface ThemePickerProps {
  value: ThemeId;
  onChange: (themeId: ThemeId) => void;
}

export default function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="theme-select-wrapper">
      <select
        className="theme-select"
        value={value}
        onChange={(e) => onChange(e.target.value as ThemeId)}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.emoji} {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}

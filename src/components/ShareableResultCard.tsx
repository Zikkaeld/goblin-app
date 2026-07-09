import { forwardRef } from 'react';
import { RARITY_MAP } from '../data';
import type { Rarity } from '../types';

interface ShareableResultCardProps {
  title: string;
  emoji: string;
  rarity: Rarity;
  themeLabel: string;
  themeEmoji: string;
  roomName?: string;
}

const ShareableResultCard = forwardRef<HTMLDivElement, ShareableResultCardProps>(function ShareableResultCard(
  { title, emoji, rarity, themeLabel, themeEmoji, roomName },
  ref
) {
  const rarityInfo = RARITY_MAP[rarity];

  return (
    <div
      ref={ref}
      style={{
        width: 540,
        height: 720,
        boxSizing: 'border-box',
        padding: '48px 40px',
        borderRadius: 14,
        background: 'linear-gradient(160deg, #5a3d1f 0%, #3f2a15 100%)',
        border: '6px solid #2e1d0d',
        boxShadow: 'inset 0 0 0 3px #7a5530',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: "'Pixelify Sans', 'Segoe UI', system-ui, sans-serif",
        color: '#eadfc4',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 600, opacity: 0.75 }}>
        <span>{themeEmoji}</span>
        <span>{themeLabel}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ fontSize: 150, lineHeight: 1 }}>{emoji}</div>
        <div
          style={{
            fontFamily: "'Silkscreen', 'Pixelify Sans', sans-serif",
            fontSize: 30,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.35,
            maxWidth: 440,
            textShadow: '2px 2px 0 #1a0f06',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 24px',
            borderRadius: 6,
            background: '#3f2a15',
            border: `3px solid ${rarityInfo.color}`,
            boxShadow: rarityInfo.glow,
            fontSize: 16,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: rarityInfo.color,
          }}
        >
          {rarityInfo.label}
        </div>
        {roomName && <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.8 }}>🏡 Кімната «{roomName}»</div>}
      </div>

      <div
        style={{
          fontFamily: "'Silkscreen', 'Pixelify Sans', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: '#ffc85e',
          textShadow: '1px 1px 0 #1a0f06',
        }}
      >
        WhoU 🎲
      </div>
    </div>
  );
});

export default ShareableResultCard;

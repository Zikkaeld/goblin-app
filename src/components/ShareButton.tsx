import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import ShareableResultCard from './ShareableResultCard';
import type { Rarity } from '../types';

interface ImageCardData {
  title: string;
  emoji: string;
  rarity: Rarity;
  themeLabel: string;
  themeEmoji: string;
  roomName?: string;
}

interface ShareButtonProps {
  text: string;
  rollId?: string | null;
  label?: string;
  onShared: (message: string) => void;
  imageCard?: ImageCardData;
}

export default function ShareButton({
  text,
  rollId,
  label = '📤 Поділитися результатом',
  onShared,
  imageCard,
}: ShareButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fullText = rollId ? `${text}\n${window.location.origin}/result/${rollId}` : text;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: fullText });
        return;
      } catch {
        // користувач скасував — тихо пробуємо копіювання нижче
      }
    }
    try {
      await navigator.clipboard.writeText(fullText);
      onShared('Скопійовано в буфер обміну! 📋');
    } catch {
      onShared(fullText);
    }
  }

  async function handleShareImage() {
    if (!cardRef.current || generatingImage) return;
    setGeneratingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('canvas.toBlob failed');

      const file = new File([blob], 'whou-result.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: fullText });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'whou-result.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onShared('Картинку збережено! 📸');
    } catch {
      onShared('Не вдалося створити картинку 😢');
    } finally {
      setGeneratingImage(false);
    }
  }

  return (
    <>
      <div className="share-buttons">
        <button type="button" className="btn btn--share" onClick={handleShare}>
          {label}
        </button>
        {imageCard && (
          <button type="button" className="btn btn--share" onClick={handleShareImage} disabled={generatingImage}>
            {generatingImage ? '⏳ Готуємо…' : '📸 Зберегти як картинку'}
          </button>
        )}
      </div>

      {imageCard && (
        <div style={{ position: 'fixed', top: -10000, left: -10000, pointerEvents: 'none' }} aria-hidden="true">
          <ShareableResultCard
            ref={cardRef}
            title={imageCard.title}
            emoji={imageCard.emoji}
            rarity={imageCard.rarity}
            themeLabel={imageCard.themeLabel}
            themeEmoji={imageCard.themeEmoji}
            roomName={imageCard.roomName}
          />
        </div>
      )}
    </>
  );
}

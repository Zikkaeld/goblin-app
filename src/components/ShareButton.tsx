interface ShareButtonProps {
  text: string;
  label?: string;
  onShared: (message: string) => void;
}

export default function ShareButton({ text, label = '📤 Поділитися результатом', onShared }: ShareButtonProps) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // користувач скасував — тихо пробуємо копіювання нижче
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      onShared('Скопійовано в буфер обміну! 📋');
    } catch {
      onShared(text);
    }
  }

  return (
    <button type="button" className="btn btn--share" onClick={handleShare}>
      {label}
    </button>
  );
}

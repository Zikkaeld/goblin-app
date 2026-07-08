interface AdModalProps {
  reward: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AdModal({ reward, onClose, onConfirm }: AdModalProps) {
  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ad-modal__screen">
          <span className="ad-modal__play">📺</span>
          <p>тут буде реклама</p>
          <span className="ad-modal__sub">(заглушка, без реальної інтеграції)</span>
        </div>
        <button type="button" className="btn btn--primary" onClick={onConfirm}>
          Готово, дай +{reward} {reward === 1 ? 'кидок' : 'кидки'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Скасувати
        </button>
      </div>
    </div>
  );
}

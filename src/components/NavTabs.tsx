export type MainView = 'rooms' | 'solo' | 'collection' | 'profile';

interface NavTabsProps {
  active: MainView;
  onChange: (view: MainView) => void;
}

export default function NavTabs({ active, onChange }: NavTabsProps) {
  return (
    <nav className="nav-tabs">
      <button
        type="button"
        className={`nav-tabs__tab ${active === 'rooms' ? 'nav-tabs__tab--active' : ''}`}
        onClick={() => onChange('rooms')}
      >
        🏡 Кімнати
      </button>
      <button
        type="button"
        className={`nav-tabs__tab ${active === 'solo' ? 'nav-tabs__tab--active' : ''}`}
        onClick={() => onChange('solo')}
      >
        🎲 Соло-ролл
      </button>
      <button
        type="button"
        className={`nav-tabs__tab ${active === 'collection' ? 'nav-tabs__tab--active' : ''}`}
        onClick={() => onChange('collection')}
      >
        🏆 Колекція
      </button>
      <button
        type="button"
        className={`nav-tabs__tab ${active === 'profile' ? 'nav-tabs__tab--active' : ''}`}
        onClick={() => onChange('profile')}
      >
        👤 Профіль
      </button>
    </nav>
  );
}

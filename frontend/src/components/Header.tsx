interface Props {
  onAddGameClick?: () => void;
}

export default function Header({ onAddGameClick }: Props) {
  return (
    <header className="app-header">
      <a href="/" className="app-header__logo" style={{ textDecoration: "none" }}>
        <svg width="36" height="36" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <line x1="50" y1="62" x2="112" y2="44" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.35"/>
          <line x1="112" y1="44" x2="156" y2="88" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.35"/>
          <line x1="156" y1="88" x2="138" y2="138" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.35"/>
          <line x1="138" y1="138" x2="75" y2="150" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.35"/>
          <line x1="75" y1="150" x2="38" y2="118" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.35"/>
          <line x1="38" y1="118" x2="50" y2="62" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.35"/>
          <line x1="50" y1="62" x2="156" y2="88" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.18"/>
          <line x1="112" y1="44" x2="75" y2="150" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.18"/>
          <circle cx="50" cy="62" r="7" fill="#38bdf8"/>
          <circle cx="156" cy="88" r="7" fill="#38bdf8"/>
          <circle cx="75" cy="150" r="7" fill="#38bdf8"/>
          <circle cx="112" cy="44" r="5" fill="#38bdf8" fillOpacity="0.65"/>
          <circle cx="138" cy="138" r="5" fill="#38bdf8" fillOpacity="0.65"/>
          <circle cx="38" cy="118" r="4" fill="#38bdf8" fillOpacity="0.5"/>
        </svg>
        <div>
          <div className="app-header__title">WaitForSale</div>
          <div className="app-header__subtitle">Steam Deal Predictor</div>
        </div>
      </a>
      {onAddGameClick && (
        <button 
          onClick={onAddGameClick}
          style={{
            marginLeft: 'auto',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}
        >
          ➕ 새 게임 등록
        </button>
      )}
    </header>
  );
}

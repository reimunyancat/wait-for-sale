import React from "react";

export default function Header() {
  return (
    <header className="app-header">
      <a href="/" className="app-header__logo" style={{ textDecoration: "none" }}>
        <span style={{ fontSize: "1.4rem" }}>🎮</span>
        <div>
          <div className="app-header__title">WaitForSale</div>
          <div className="app-header__subtitle">Steam Deal Predictor</div>
        </div>
      </a>
      <div className="app-header__badge">⚡ XGBoost AI</div>
    </header>
  );
}

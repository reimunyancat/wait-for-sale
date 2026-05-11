import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="search-wrap">
      <div className="search-inner">
        <input
          type="text"
          placeholder="게임 이름으로 검색..."
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className="search-icon">🔍</span>
        {query && (
          <button
            onClick={handleClear}
            style={{
              position: "absolute",
              right: "36px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

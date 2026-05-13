import './App.css';
import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import GameList from "./components/GameList";
import GameDetailPage from "./components/GameDetailPage";
import AddGameModal from "./components/AddGameModal";
import type { Game } from "./components/GameCard";
import {
  fetchAllGames,
  searchGames,
  fetchAllPredictions,
  type GameFromAPI,
  type PredictionCache,
} from "./services/api";

function getConfidence(prob: number): "high" | "medium" | "low" {
  if (prob >= 0.7) return "high";
  if (prob >= 0.4) return "medium";
  return "low";
}

function mapApiToGame(apiGame: GameFromAPI, pred?: PredictionCache): Game {
  const isOnSale = apiGame.is_on_sale && apiGame.discount_price != null && apiGame.discount_price < (apiGame.current_price ?? Infinity);
  const prob = pred?.peak_probability;
  return {
    id: apiGame.id,
    name: apiGame.name,
    developer: apiGame.developer || "Unknown",
    header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${apiGame.id}/header.jpg`,
    original_price: apiGame.current_price ? apiGame.current_price * 100 : undefined,
    current_price: isOnSale && apiGame.discount_price
      ? apiGame.discount_price * 100
      : apiGame.current_price
        ? apiGame.current_price * 100
        : undefined,
    is_on_sale: isOnSale,
    sale_probability: prob ?? undefined,
    peak_probability: prob ?? undefined,
    peak_day: pred?.peak_day ?? undefined,
    predicted_sale_date: pred?.predicted_sale_date ?? undefined,
    days_until_sale: pred?.days_until_sale ?? undefined,
    is_predicted_on_sale: pred?.is_predicted_on_sale ?? undefined,
    prediction_confidence: prob != null ? getConfidence(prob) : undefined,
  };
}

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [searchResults, setSearchResults] = useState<Game[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [apiGames, predictions] = await Promise.all([
        fetchAllGames(),
        fetchAllPredictions().catch(() => ({} as Record<string, PredictionCache>)),
      ]);
      setGames(apiGames.map((g) => mapApiToGame(g, predictions[g.id])));
    } catch (err) {
      console.error("Failed to load games:", err);
      setError("게임 목록을 불러오는데 실패했어요. 서버가 실행 중인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) { setSearchResults(null); return; }
    try {
      const results = await searchGames(query);
      setSearchResults(results.map((g) => mapApiToGame(g)));
    } catch {
      setError("검색에 실패했어요.");
    }
  };

  if (selectedGameId) {
    return <GameDetailPage 
      gameId={selectedGameId} 
      onBack={() => setSelectedGameId(null)} 
      onDeleted={() => {
        setSelectedGameId(null);
        loadGames();
      }}
    />;
  }

  const onSaleGames = games.filter((g) => g.is_on_sale);
  const predictedSaleGames = games.filter(
    (g) => !g.is_on_sale && (g.peak_probability ?? 0) >= 0.6,
  );
  const displayGames = searchResults ?? games;

  return (
    <div className="app-root">
      <Header onAddGameClick={() => setIsAddGameModalOpen(true)} />
      <SearchBar onSearch={handleSearch} />
      <AddGameModal 
        isOpen={isAddGameModalOpen} 
        onClose={() => setIsAddGameModalOpen(false)} 
        onGameAdded={loadGames} 
      />

      <main className="main-content">
        {loading && (
          <div className="loading-wrap">
            <div className="loading-spinner" />
            <span className="loading-text">로딩 중...</span>
          </div>
        )}
        {error && <div className="error-banner"><p>⚠️ {error}</p></div>}

        {!loading && !error && (
          <>
            {searchResults ? (
              <GameList title={`검색 결과 (${searchResults.length}개)`} games={searchResults} onGameClick={setSelectedGameId} />
            ) : (
              <>
                {onSaleGames.length > 0 && (
                  <GameList title="🔥 현재 할인 중" games={onSaleGames} onGameClick={setSelectedGameId} />
                )}
                {predictedSaleGames.length > 0 && (
                  <div className="predicted-sale-banner">
                    <div className="predicted-sale-banner__header">
                      🔮 할인 예상 게임
                      <span className="predicted-sale-banner__count">{predictedSaleGames.length}개</span>
                    </div>
                    <GameList title="" games={predictedSaleGames} onGameClick={setSelectedGameId} />
                  </div>
                )}
                <GameList title="🎮 전체 게임" games={displayGames} onGameClick={setSelectedGameId} />
              </>
            )}
            {displayGames.length === 0 && (
              <div className="empty-state">
                <p>표시할 게임이 없어요.</p>
                <p className="empty-state__sub">서버에서 데이터를 수집했는지 확인해주세요.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;

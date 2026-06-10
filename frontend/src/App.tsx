import './App.css';
import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import GameList from "./components/GameList";
import type { Game } from "./components/GameCard";
import {
  fetchAllGames,
  searchGames,
  fetchPrediction,
  type GameFromAPI,
} from "./services/api";

function mapApiToGame(apiGame: GameFromAPI): Game {
  return {
    id: apiGame.id,
    name: apiGame.name,
    developer: apiGame.developer || "Unknown",
    header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${apiGame.id}/header.jpg`,
    original_price: apiGame.current_price ? apiGame.current_price * 100 : undefined,
    current_price: apiGame.discount_price
      ? apiGame.discount_price * 100
      : apiGame.current_price
        ? apiGame.current_price * 100
        : undefined,
    sale_probability: undefined,
    is_predicted_on_sale: undefined,
    prediction_confidence: undefined,
  };
}

function getConfidence(prob: number): "high" | "medium" | "low" {
  if (prob >= 0.7) return "high";
  if (prob >= 0.4) return "medium";
  return "low";
}

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [searchResults, setSearchResults] = useState<Game[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGamesWithPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiGames = await fetchAllGames();
      const mapped = apiGames.map(mapApiToGame);
      setGames(mapped);
      setLoading(false);

      // 예측은 백그라운드에서 순차적으로 붙이기
      setPredicting(true);
      const updated = [...mapped];
      for (let i = 0; i < updated.length; i++) {
        try {
          const pred = await fetchPrediction(updated[i].id);
          updated[i] = {
            ...updated[i],
            sale_probability: pred.sale_prediction_probability,
            is_predicted_on_sale: pred.is_predicted_to_be_on_sale,
            prediction_confidence: getConfidence(pred.sale_prediction_probability),
          };
          if (i % 10 === 9 || i === updated.length - 1) {
            setGames([...updated]);
          }
        } catch {
          // 예측 실패 무시하고 다음으로
        }
      }
      setPredicting(false);
    } catch (err) {
      console.error("Failed to load games:", err);
      setError("게임 목록을 불러오는데 실패했어요. 서버가 실행 중인지 확인해주세요.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGamesWithPredictions();
  }, [loadGamesWithPredictions]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await searchGames(query);
      setSearchResults(results.map(mapApiToGame));
    } catch (err) {
      console.error("Search failed:", err);
      setError("검색에 실패했어요.");
    }
  };

  const onSaleGames = games.filter(
    (g) => g.original_price && g.current_price && g.original_price > g.current_price,
  );

  const displayGames = searchResults ?? games;

  return (
    <div className="app-root">
      <Header />
      <SearchBar onSearch={handleSearch} />

      {predicting && (
        <div className="predicting-banner">
          <span className="predicting-dot" />
          AI 할인 예측 분석 중...
        </div>
      )}

      <main className="main-content">
        {loading && (
          <div className="loading-wrap">
            <div className="loading-spinner" />
            <span className="loading-text">로딩 중...</span>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <p>⚠️ {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {searchResults ? (
              <GameList title={`검색 결과 (${searchResults.length}개)`} games={searchResults} />
            ) : (
              <>
                {onSaleGames.length > 0 && (
                  <GameList title="🔥 현재 할인 중" games={onSaleGames} />
                )}
                <GameList title="🎮 전체 게임" games={displayGames} />
              </>
            )}
            {!loading && displayGames.length === 0 && (
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

import axios from "axios";

const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface GameFromAPI {
  id: string;
  name: string;
  developer: string;
  publisher: string;
  release_date: string;
  genres: string[];
  tags: string[];
  platforms: string[];
  metascore: number | null;
  current_price: number | null;
  discount_price: number | null;
  discount_percent: number | null;
  is_on_sale: boolean;
  last_checked: string | null;
}

export interface PriceHistoryEntry {
  price: number;
  discount_price: number;
  discount_percent: number;
  is_on_sale: boolean;
  recorded_date: string;
}

export interface PredictionResult {
  appid: string;
  sale_prediction_probability: number;
  is_predicted_to_be_on_sale: boolean;
  confidence?: "high" | "medium" | "low";
  message?: string;
}

export interface GameDetail {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  header_image: string;
  background: string;
  screenshots: { id: number; path_thumbnail: string; path_full: string }[];
  genres: { id: string; description: string }[];
  categories: { id: number; description: string }[];
  developers: string[];
  publishers: string[];
  release_date: { coming_soon: boolean; date: string };
  metacritic?: { score: number; url: string };
  supported_languages: string;
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    initial_formatted: string;
    final_formatted: string;
  };
  total_reviews?: number;
}

// 모든 게임 목록 조회
export const fetchAllGames = async (): Promise<GameFromAPI[]> => {
  const response = await api.get("/games");
  return response.data.data;
};

// 게임 검색
export const searchGames = async (name: string): Promise<GameFromAPI[]> => {
  const response = await api.get(
    `/games/search?name=${encodeURIComponent(name)}`,
  );
  return response.data.data;
};

// 가격 히스토리 조회
export const fetchPriceHistory = async (
  gameId: string,
  limit?: number,
): Promise<PriceHistoryEntry[]> => {
  const params = limit ? `?limit=${limit}` : "";
  const response = await api.get(`/games/${gameId}/price-history${params}`);
  return response.data.data;
};

// ML 예측 결과 가져오기
export const fetchPrediction = async (
  gameId: string,
): Promise<PredictionResult> => {
  const response = await api.get(`/games/${gameId}/predict`);
  return response.data.data;
};

// 게임 상세 정보 가져오기
export const fetchGameDetail = async (gameId: string): Promise<GameDetail> => {
  const response = await api.get(`/games/${gameId}/detail`);
  return response.data.data;
};

export interface PredictionCache {
  game_id: string;
  sale_probability: number | null;
  is_predicted_on_sale: boolean | null;
  confidence: string | null;
  prediction_message: string | null;
  predicted_sale_date: string | null;
  days_until_sale: number | null;
  peak_probability: number | null;
  peak_day: number | null;
  updated_at: string;
}

// 전체 게임 prediction 한번에 가져오기 (gameId → cache map)
export const fetchAllPredictions = async (): Promise<Record<string, PredictionCache>> => {
  const response = await api.get("/games/predictions/all");
  const rows: PredictionCache[] = response.data.data;
  const map: Record<string, PredictionCache> = {};
  for (const row of rows) {
    map[row.game_id] = row;
  }
  return map;
};

// 데이터 수동 수집 트리거
export const triggerDataFetch = async () => {
  const response = await api.post("/games/fetch");
  return response.data;
};

// 스팀 상점 검색
export interface SteamSearchItem {
  id: number;
  name: string;
  tiny_image: string;
  price?: {
    final: number;
    initial: number;
    currency: string;
  };
}

export const searchSteamGames = async (query: string): Promise<SteamSearchItem[]> => {
  const response = await api.get(`/games/steam-search?q=${encodeURIComponent(query)}`);
  return response.data.data.items || [];
};

// 게임 추가
export const addGame = async (appid: number): Promise<{ success: boolean; message: string; name?: string }> => {
  const response = await api.post("/games/add", { appid });
  return response.data;
};

export default api;

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

// 데이터 수동 수집 트리거
export const triggerDataFetch = async () => {
  const response = await api.post("/games/fetch");
  return response.data;
};

export default api;

import axios from "axios";
import { query } from "../db";

const ML_SERVER_URL = process.env.ML_SERVER_URL || "http://localhost:8000";

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

function probabilityToConfidence(prob: number): string {
  if (prob >= 0.7) return "high";
  if (prob >= 0.4) return "medium";
  return "low";
}

function probabilityToMessage(prob: number): string {
  const pct = Math.round(prob * 100);
  if (prob >= 0.7) return `${pct}% 확률로 곧 할인 가능성이 높습니다!`;
  if (prob >= 0.4) return `${pct}% 확률로 할인될 수 있습니다.`;
  return `${pct}% 확률 — 당분간 할인 가능성은 낮습니다.`;
}

const SELECT_PREDICTION = `
  SELECT
    game_id, sale_probability, is_predicted_on_sale, confidence, prediction_message,
    TO_CHAR(predicted_sale_date, 'YYYY-MM-DD') AS predicted_sale_date,
    (predicted_sale_date - CURRENT_DATE) AS days_until_sale,
    peak_probability, peak_day, updated_at
  FROM prediction_cache
  WHERE game_id = $1
`;

export async function getPredictionCached(gameId: string): Promise<PredictionCache> {
  const cacheResult = await query(SELECT_PREDICTION, [gameId]);
  if (cacheResult.rows.length > 0) {
    const cached = cacheResult.rows[0];
    const updatedAt = new Date(cached.updated_at).getTime();
    if (Date.now() - updatedAt < 24 * 60 * 60 * 1000) {
      return cached as PredictionCache;
    }
  }

  const mlResponse = await axios.get(`${ML_SERVER_URL}/predict_range?appid=${gameId}`, {
    timeout: 30000,
  });
  const rangeData = mlResponse.data;

  const currentProb = rangeData.predictions?.[0]?.probability ?? null;
  const peakProb = rangeData.peak_probability ?? null;

  await query(
    `INSERT INTO prediction_cache (
      game_id, sale_probability, is_predicted_on_sale, confidence, prediction_message,
      predicted_sale_date, peak_probability, peak_day, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    ON CONFLICT (game_id) DO UPDATE SET
      sale_probability = EXCLUDED.sale_probability,
      is_predicted_on_sale = EXCLUDED.is_predicted_on_sale,
      confidence = EXCLUDED.confidence,
      prediction_message = EXCLUDED.prediction_message,
      predicted_sale_date = EXCLUDED.predicted_sale_date,
      peak_probability = EXCLUDED.peak_probability,
      peak_day = EXCLUDED.peak_day,
      updated_at = CURRENT_TIMESTAMP`,
    [
      gameId,
      currentProb,
      currentProb != null ? currentProb >= 0.5 : null,
      currentProb != null ? probabilityToConfidence(currentProb) : null,
      currentProb != null ? probabilityToMessage(currentProb) : null,
      rangeData.predicted_sale_date ?? null,
      peakProb,
      rangeData.peak_day ?? null,
    ]
  );

  const fresh = await query(SELECT_PREDICTION, [gameId]);
  return fresh.rows[0] as PredictionCache;
}

export async function refreshAllPredictions(): Promise<void> {
  console.log("[PredictionService] Starting refreshAllPredictions...");
  try {
    const gamesResult = await query("SELECT id FROM games");
    console.log(`[PredictionService] Refreshing ${gamesResult.rows.length} games...`);

    for (const game of gamesResult.rows) {
      try {
        await query("DELETE FROM prediction_cache WHERE game_id = $1", [game.id]);
        await getPredictionCached(game.id);
        console.log(`[PredictionService] ✓ ${game.id}`);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          console.log(`[PredictionService] skip ${game.id} (not in ITAD)`);
        } else {
          console.error(`[PredictionService] failed ${game.id}:`, err);
        }
      }
    }
    console.log("[PredictionService] Done.");
  } catch (err) {
    console.error("[PredictionService] refreshAllPredictions error:", err);
  }
}

import { Router, Request, Response } from "express";
import axios from "axios";
import { saveGameData, fetchAndSaveSingleGame } from "../services/steamService";
import { searchGamesByName, getPriceHistory, getAllGames, query } from "../db";
import { getPredictionCached, refreshAllPredictions } from "../services/predictionService";

const router = Router();

router.post("/fetch", async (req: Request, res: Response) => {
  try {
    const result = await saveGameData();
    res.status(200).json(result);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch game data.", error });
  }
});

router.get("/steam-search", async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(400).json({ success: false, message: "Query parameter 'q' is required." });
  }

  try {
    const steamRes = await axios.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=korean&cc=kr`);
    res.status(200).json({ success: true, data: steamRes.data });
  } catch (error) {
    console.error("Steam search failed:", error);
    res.status(500).json({ success: false, message: "Failed to search on Steam." });
  }
});

router.post("/add", async (req: Request, res: Response) => {
  const { appid } = req.body;
  if (!appid) {
    return res.status(400).json({ success: false, message: "appid is required." });
  }

  try {
    const result = await fetchAndSaveSingleGame(Number(appid));
    if (result.success) {
      res.status(200).json({ success: true, message: `Game ${result.name} added successfully.` });
      // 추가 후 백그라운드에서 예측 캐시 새로고침
      refreshAllPredictions().catch(console.error);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Failed to add game:", error);
    res.status(500).json({ success: false, message: "Failed to add game." });
  }
});

router.get("/search", async (req: Request, res: Response) => {
  const { name } = req.query;

  if (typeof name !== "string" || name.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Query parameter 'name' is required." });
  }

  try {
    const games = await searchGamesByName(name);
    res.status(200).json({ success: true, data: games });
  } catch (error) {
    console.error("Search failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to search for games." });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const games = await getAllGames();
    res.status(200).json({ success: true, data: games });
  } catch (error) {
    console.error("Failed to get games:", error);
    res.status(500).json({ success: false, message: "Failed to get games." });
  }
});

router.get("/predictions/all", async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        game_id, sale_probability, is_predicted_on_sale, confidence, prediction_message,
        TO_CHAR(predicted_sale_date, 'YYYY-MM-DD') AS predicted_sale_date,
        (predicted_sale_date - CURRENT_DATE) AS days_until_sale,
        peak_probability, peak_day, updated_at
      FROM prediction_cache
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Failed to get all predictions:", error);
    res.status(500).json({ success: false, message: "Failed to get predictions." });
  }
});

router.post("/refresh-predictions", async (req: Request, res: Response) => {
  res.status(202).json({ success: true, message: "Prediction refresh started in background." });
  refreshAllPredictions().catch(console.error);
});

router.get("/:id/price-history", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { limit } = req.query;

  try {
    const history = await getPriceHistory(id, Number(limit) || 90);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error("Failed to get price history:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get price history." });
  }
});

router.get("/:id/predict", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const cached = await getPredictionCached(id);
    res.status(200).json({
      success: true,
      data: {
        appid: cached.game_id,
        sale_prediction_probability: cached.sale_probability ?? 0,
        is_predicted_to_be_on_sale: cached.is_predicted_on_sale ?? false,
        confidence: cached.confidence ?? "low",
        message: cached.prediction_message ?? "",
        predicted_sale_date: cached.predicted_sale_date,
        days_until_sale: cached.days_until_sale,
        peak_probability: cached.peak_probability,
        peak_day: cached.peak_day,
      },
    });
  } catch (error) {
    console.error("Prediction failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get prediction." });
  }
});

router.get("/:id/detail", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const steamRes = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${id}&cc=kr&l=korean`,
      { timeout: 10000 }
    );

    const appData = (steamRes.data as Record<string, any>)?.[id];
    if (!appData || !appData.success || !appData.data) {
      return res
        .status(404)
        .json({ success: false, message: "Game not found on Steam." });
    }

    const d = appData.data;

    const detail = {
      id: String(id),
      name: d.name || "",
      short_description: d.short_description || "",
      detailed_description: d.detailed_description || "",
      header_image: d.header_image || "",
      background: d.background_raw || d.background || "",
      screenshots: (d.screenshots || []).slice(0, 4).map((s: any) => ({
        id: s.id,
        path_thumbnail: s.path_thumbnail,
        path_full: s.path_full,
      })),
      genres: (d.genres || []).map((g: any) => ({
        id: g.id,
        description: g.description,
      })),
      categories: (d.categories || []).map((c: any) => ({
        id: c.id,
        description: c.description,
      })),
      developers: d.developers || [],
      publishers: d.publishers || [],
      release_date: d.release_date || { coming_soon: false, date: "" },
      metacritic: d.metacritic
        ? { score: d.metacritic.score, url: d.metacritic.url }
        : undefined,
      supported_languages: d.supported_languages || "",
      price_overview: d.price_overview
        ? {
            currency: d.price_overview.currency,
            initial: d.price_overview.initial,
            final: d.price_overview.final,
            discount_percent: d.price_overview.discount_percent,
            initial_formatted: d.price_overview.initial_formatted,
            final_formatted: d.price_overview.final_formatted,
          }
        : undefined,
      total_reviews: d.recommendations?.total ?? undefined,
    };

    res.status(200).json({ success: true, data: detail });
  } catch (error) {
    console.error("Failed to get game detail:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get game detail." });
  }
});

export default router;

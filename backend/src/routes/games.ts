import { Router, Request, Response } from "express";
import axios from "axios";
import { saveGameData } from "../services/steamService";
import { searchGamesByName, getPriceHistory, getAllGames } from "../db";

const router = Router();

const ML_SERVER_URL = process.env.ML_SERVER_URL || "http://localhost:8000";

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

// 모든 게임 목록 조회
router.get("/", async (req: Request, res: Response) => {
  try {
    const games = await getAllGames();
    res.status(200).json({ success: true, data: games });
  } catch (error) {
    console.error("Failed to get games:", error);
    res.status(500).json({ success: false, message: "Failed to get games." });
  }
});

// 게임별 가격 히스토리 조회
router.get("/:id/price-history", async (req: Request, res: Response) => {
  const { id } = req.params;
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

// ML 서버 예측 결과 프록시
router.get("/:id/predict", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const mlResponse = await axios.post(`${ML_SERVER_URL}/predict?appid=${id}`);
    res.status(200).json({ success: true, data: mlResponse.data });
  } catch (error) {
    console.error("ML prediction failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get prediction." });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { saveGameData } from "../services/steamService";
import { searchGamesByName } from "../db";

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

router.get("/search", async (req: Request, res: Response) => {
  const { name } = req.query;

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, message: "Query parameter 'name' is required." });
  }

  try {
    const games = await searchGamesByName(name);
    res.status(200).json({ success: true, data: games });
  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ success: false, message: "Failed to search for games." });
  }
});

export default router;

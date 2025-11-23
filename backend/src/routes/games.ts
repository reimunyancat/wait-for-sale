import { Router, Request, Response } from "express";
import { saveGameData } from "../services/steamService";

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

export default router;

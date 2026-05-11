import express, { Request, Response } from "express";
import cors from "cors";
import gamesRouter from "./routes/games";
import dotenv from "dotenv";
import path from "path";
import { connectDb, initializeDb, DbConfig } from "./db";
import cron from "node-cron";
import { saveGameData } from "./services/steamService";
import { refreshAllPredictions } from "./services/predictionService";

const dotenvResult = dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});
if (dotenvResult.error) {
  console.error("Error loading .env file:", dotenvResult.error);
}

const envConfig = dotenvResult.parsed || {};

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://10.10.68.190:5173",
      "http://touhou.e3e.net:5173",
    ],
    methods: ["GET", "POST"],
  }),
);
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Yui is here! 🎸");
});

app.use("/api/games", gamesRouter);

const initScheduler = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      await saveGameData();
    } catch (error) {
      console.error(error);
    }
  });
  // 매일 오전 3시 prediction 캐시 갱신
  cron.schedule("0 3 * * *", async () => {
    try {
      await refreshAllPredictions();
    } catch (error) {
      console.error(error);
    }
  });
};

const initApp = async () => {
  try {
    const dbConfig: DbConfig = {
      user: envConfig.DB_USER,
      host: envConfig.DB_HOST,
      database: envConfig.DB_NAME,
      password: envConfig.DB_PASSWORD,
      port: envConfig.DB_PORT,
    };
    await connectDb(dbConfig);
    await initializeDb();
    initScheduler();
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
      // 백그라운드로 예측 캐시 갱신 (서버 시작 시)
      refreshAllPredictions().catch(console.error);
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

initApp();

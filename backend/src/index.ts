import express, { Request, Response } from "express";
import gamesRouter from "./routes/games";
import dotenv from "dotenv";
import path from "path";
import { connectDb, initializeDb, DbConfig } from "./db";
import cron from "node-cron";
import { saveGameData } from "./services/steamService";

const dotenvResult = dotenv.config({ path: path.resolve(__dirname, "../../.env") });
if (dotenvResult.error) {
  console.error("Error loading .env file:", dotenvResult.error);
}

const envConfig = dotenvResult.parsed || {};

const app = express();
const port = process.env.PORT || 3000;

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
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

initApp();

import { fetchAndSaveSingleGame } from "./src/services/steamService";
import { connectDb, disconnectDb } from "./src/db/index";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });
async function run() {
  await connectDb({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  await fetchAndSaveSingleGame(381210);
  await disconnectDb();
}
run();

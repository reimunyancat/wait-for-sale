import { Pool, QueryResult } from "pg";
import * as fs from "fs";
import * as path from "path";

// Module-scoped pool, to be initialized in connectDb
let pool: Pool;

// Interface for the config for type safety
export interface DbConfig {
  user?: string;
  host?: string;
  database?: string;
  password?: string;
  port?: string;
}

export const connectDb = async (config: DbConfig): Promise<void> => {
  try {
    pool = new Pool({
      user: config.user,
      host: config.host,
      database: config.database,
      password: config.password,
      port: parseInt(config.port || "5432", 10),
    });
    await pool.connect();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

export const query = (
  text: string,
  params: any[] = [],
): Promise<QueryResult> => {
  if (!pool) throw new Error("Database not connected. Call connectDb first.");
  return pool.query(text, params);
};

export const disconnectDb = async (): Promise<void> => {
  if (!pool) return;
  await pool.end();
  console.log("Database disconnected.");
};

export const initializeDb = async (): Promise<void> => {
  try {
    const schemaSql = fs.readFileSync(
      path.join(__dirname, "schema.sql"),
      "utf8",
    );
    await query(schemaSql);
    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    process.exit(1);
  }
};

export const searchGamesByName = async (name: string) => {
  const sql = "SELECT * FROM games WHERE name ILIKE $1";
  const result = await query(sql, [`%${name}%`]);
  return result.rows;
};

export const getAllGames = async () => {
  const sql = `
    SELECT g.*, 
      ph.price as current_price, 
      ph.discount_price, 
      ph.discount_percent, 
      ph.is_on_sale,
      ph.recorded_date as last_checked
    FROM games g
    LEFT JOIN LATERAL (
      SELECT * FROM price_history 
      WHERE game_id = g.id 
      ORDER BY recorded_date DESC 
      LIMIT 1
    ) ph ON true
    ORDER BY g.name
  `;
  const result = await query(sql);
  return result.rows;
};

export const getPriceHistory = async (gameId: string, limit: number = 90) => {
  const sql = `
    SELECT price, discount_price, discount_percent, is_on_sale, recorded_date
    FROM price_history 
    WHERE game_id = $1 
    ORDER BY recorded_date DESC 
    LIMIT $2
  `;
  const result = await query(sql, [gameId, limit]);
  return result.rows;
};

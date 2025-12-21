import { Pool, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

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
      port: parseInt(config.port || '5432', 10),
    });
    await pool.connect();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export const query = (text: string, params: any[] = []): Promise<QueryResult> => {
  if (!pool) throw new Error("Database not connected. Call connectDb first.");
  return pool.query(text, params);
};

export const disconnectDb = async (): Promise<void> => {
  if (!pool) return;
  await pool.end();
  console.log('Database disconnected.');
};

export const initializeDb = async (): Promise<void> => {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await query(schemaSql);
    console.log('Database schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  }
};

export const searchGamesByName = async (name: string) => {
  const sql = 'SELECT * FROM games WHERE name ILIKE $1';
  const result = await query(sql, [`%${name}%`]);
  return result.rows;
};
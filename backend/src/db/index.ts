import { Pool, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

export const query = (text: string, params: any[] = []): Promise<QueryResult> => {
  return pool.query(text, params);
};

export const connectDb = async (): Promise<void> => {
  try {
    await pool.connect();
    console.log('Database connected successfully.');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDb = async (): Promise<void> => {
  await pool.end();
  console.log('Database disconnected.');
};

export const initializeDb = async (): Promise<void> => {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  }
};
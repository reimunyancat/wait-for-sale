import express, { Request, Response } from 'express';
import gamesRouter from './routes/games';
import dotenv from 'dotenv';
import { connectDb, initializeDb } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, Yui is here! 🎸');
});

app.use('/api/games', gamesRouter);

const initApp = async () => {
  try {
    await connectDb();
    await initializeDb();
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

initApp();

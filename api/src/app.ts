import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './db';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: 'ok', time: new Date().toISOString() });
  } catch (err) {
    console.error('DB health check failed:', err);
    res.status(503).json({ db: 'unavailable' });
  }
});
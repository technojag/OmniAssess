import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { prisma } from './db';
import { authRouter } from './modules/auth/auth.routes';
import { onboardingRouter } from './modules/onboarding/onboarding.routes';
import { examsRouter } from './modules/exams/exams.routes';
import { attemptsRouter } from './modules/attempts/attempts.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { revisionRouter } from './modules/revision/revision.routes';
import { errorHandler } from './middleware/error-handler';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/admin', express.json({ limit: '2mb' }));
app.use(cookieParser());

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

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/exams', examsRouter);
app.use('/api/v1/attempts', attemptsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/revision', revisionRouter);

// Must be the LAST middleware
app.use(errorHandler);
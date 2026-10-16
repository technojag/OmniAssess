import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import { listAvailableExams } from './exams.service';

export const examsRouter = Router();

examsRouter.get('/', requireAuth, requireOnboarded, async (_req, res, next) => {
  try {
    res.json({ exams: await listAvailableExams() });
  } catch (err) {
    next(err);
  }
});
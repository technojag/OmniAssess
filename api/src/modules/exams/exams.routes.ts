import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import { filterExamsForUser } from './exams.access';
import { listAvailableExams } from './exams.service';

export const examsRouter = Router();

examsRouter.get('/', requireAuth, requireOnboarded, async (req, res, next) => {
  try {
    const exams = await listAvailableExams();
    res.json({ exams: await filterExamsForUser(req.auth!.userId, exams) });
  } catch (err) {
    next(err);
  }
});
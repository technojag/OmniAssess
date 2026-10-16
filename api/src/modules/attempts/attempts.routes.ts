import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import { attemptIdParam, startAttemptSchema } from './attempts.schemas';
import { getAttemptView, startOrResume } from './attempts.service';

export const attemptsRouter = Router();

attemptsRouter.use(requireAuth, requireOnboarded);

attemptsRouter.post('/', async (req, res, next) => {
  try {
    const { examSlug, isPractice } = startAttemptSchema.parse(req.body);
    const { attemptId, resumed } = await startOrResume(req.auth!.userId, examSlug, isPractice);
    const view = await getAttemptView(req.auth!.userId, attemptId);
    res.status(resumed ? 200 : 201).json({ resumed, ...view });
  } catch (err) {
    next(err);
  }
});

attemptsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    res.json(await getAttemptView(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});
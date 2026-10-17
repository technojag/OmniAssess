import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import { attemptIdParam, responseParams, saveResponseSchema, startAttemptSchema } from './attempts.schemas';
import { continueSection, getAttemptView, saveAnswer, startOrResume } from './attempts.service';

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

attemptsRouter.put('/:id/responses/:attemptQuestionId', async (req, res, next) => {
  try {
    const { id, attemptQuestionId } = responseParams.parse(req.params);
    const body = saveResponseSchema.parse(req.body);
    res.json(await saveAnswer(req.auth!.userId, id, attemptQuestionId, body));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.post('/:id/continue', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    await continueSection(req.auth!.userId, id);
    res.json(await getAttemptView(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});
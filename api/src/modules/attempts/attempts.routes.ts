import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import { attemptIdParam, responseParams, saveResponseSchema, startAttemptSchema } from './attempts.schemas';
import { getProctoringLog, recordViolation, violationSchema } from './attempts.proctoring';
import { getReview, getSummary } from './attempts.result';
import { continueSection, getAttemptView, saveAnswer, startOrResume } from './attempts.service';
import { submitExam } from './attempts.submit';
import { getTiming, recordQuestionView, viewEventSchema } from './attempts.timing';
import { getUndoState, undoSubmit } from './attempts.undo';

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

attemptsRouter.post('/:id/events/view', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    const { attemptQuestionId } = viewEventSchema.parse(req.body);
    res.json(await recordQuestionView(req.auth!.userId, id, attemptQuestionId));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.post('/:id/events/violation', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    const { kind } = violationSchema.parse(req.body);
    res.json(await recordViolation(req.auth!.userId, id, kind));
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

// Submitting returns the UNDO STATE. The score appears later, from GET /summary, once the undo window is closed.
attemptsRouter.post('/:id/submit', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    await submitExam(req.auth!.userId, id);
    res.json(await getUndoState(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.get('/:id/undo', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    res.json(await getUndoState(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.post('/:id/undo', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    res.json(await undoSubmit(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.get('/:id/summary', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    res.json(await getSummary(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.get('/:id/review', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    res.json(await getReview(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.get('/:id/timing', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    res.json(await getTiming(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});

attemptsRouter.get('/:id/proctoring', async (req, res, next) => {
  try {
    const { id } = attemptIdParam.parse(req.params);
    res.json(await getProctoringLog(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});
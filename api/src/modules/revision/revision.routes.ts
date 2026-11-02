import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import {
  addBody,
  addMistakes,
  addQuestion,
  listRevision,
  mistakesBody,
  questionParam,
  removeQuestion,
} from './revision.service';

export const revisionRouter = Router();

revisionRouter.use(requireAuth, requireOnboarded);

revisionRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listRevision(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});

revisionRouter.post('/', async (req, res, next) => {
  try {
    res.json(await addQuestion(req.auth!.userId, addBody.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

revisionRouter.post('/mistakes', async (req, res, next) => {
  try {
    res.json(await addMistakes(req.auth!.userId, mistakesBody.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

revisionRouter.delete('/:questionId', async (req, res, next) => {
  try {
    const { questionId } = questionParam.parse(req.params);
    res.json(await removeQuestion(req.auth!.userId, questionId));
  } catch (err) {
    next(err);
  }
});
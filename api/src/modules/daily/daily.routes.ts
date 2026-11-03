import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import { checkBody, checkDaily, getDaily } from './daily.service';

export const dailyRouter = Router();

dailyRouter.use(requireAuth, requireOnboarded);

dailyRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await getDaily());
  } catch (err) {
    next(err);
  }
});

dailyRouter.post('/check', async (req, res, next) => {
  try {
    res.json(await checkDaily(checkBody.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
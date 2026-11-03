import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireOnboarded } from '../../middleware/require-onboarded';
import { getActivity } from './activity.service';

export const activityRouter = Router();

activityRouter.use(requireAuth, requireOnboarded);

activityRouter.get('/', async (req, res, next) => {
  try {
    res.json(await getActivity(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});
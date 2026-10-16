import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { onboardingSchema } from './onboarding.schemas';
import { getProfile, saveOnboarding } from './onboarding.service';

export const onboardingRouter = Router();

onboardingRouter.use(requireAuth);

onboardingRouter.post('/', async (req, res, next) => {
  try {
    const profile = await saveOnboarding(req.auth!.userId, onboardingSchema.parse(req.body));
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.get('/', async (req, res, next) => {
  try {
    res.json({ profile: await getProfile(req.auth!.userId) });
  } catch (err) {
    next(err);
  }
});
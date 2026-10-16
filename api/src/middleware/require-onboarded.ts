import type { RequestHandler } from 'express';
import { prisma } from '../db';
import { AppError } from '../lib/errors';

// Use AFTER requireAuth. The real check lives on the server, not in the browser.
export const requireOnboarded: RequestHandler = async (req, _res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { hasCompletedOnboarding: true },
    });
    if (!user?.hasCompletedOnboarding) {
      throw new AppError(403, 'ONBOARDING_REQUIRED', 'Please complete your profile to continue.');
    }
    next();
  } catch (err) {
    next(err);
  }
};
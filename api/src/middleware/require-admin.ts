import type { RequestHandler } from 'express';
import { prisma } from '../db';
import { AppError } from '../lib/errors';

// Use after requireAuth. The role is read from the database, so a removed admin is blocked at once.
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only admins can do this.');
    }
    next();
  } catch (err) {
    next(err);
  }
};
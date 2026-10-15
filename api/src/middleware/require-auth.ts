import type { RequestHandler } from 'express';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { verifyAccessToken } from '../modules/auth/auth.tokens';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[config.cookieName];
  const payload = typeof token === 'string' ? verifyAccessToken(token) : null;
  if (!payload) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.'));
  }
  req.auth = payload;
  next();
};
import { Router } from 'express';
import type { Response } from 'express';
import { config } from '../../config';
import { AppError } from '../../lib/errors';
import { requireAuth } from '../../middleware/require-auth';
import { loginSchema, registerSchema } from './auth.schemas';
import {
  getUserById,
  issueRefreshToken,
  loginUser,
  registerUser,
  revokeRefreshToken,
  rotateRefreshToken,
} from './auth.service';
import { clearAuthCookies, setAuthCookie, setRefreshCookie } from './auth.tokens';

export const authRouter = Router();

type SessionUser = { id: string; role: 'CANDIDATE' | 'ADMIN' };

async function startSession(res: Response, user: SessionUser) {
  setAuthCookie(res, { userId: user.id, role: user.role });
  setRefreshCookie(res, await issueRefreshToken(user.id));
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const user = await registerUser(registerSchema.parse(req.body));
    await startSession(res, user);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const user = await loginUser(loginSchema.parse(req.body));
    await startSession(res, user);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[config.refreshCookieName];
    if (typeof token !== 'string') {
      throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
    }
    const { user, refreshToken } = await rotateRefreshToken(token);
    setAuthCookie(res, { userId: user.id, role: user.role });
    setRefreshCookie(res, refreshToken);
    res.json({ user });
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[config.refreshCookieName];
    if (typeof token === 'string') await revokeRefreshToken(token);
    clearAuthCookies(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.auth!.userId);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
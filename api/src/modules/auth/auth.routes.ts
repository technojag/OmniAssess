import { Router } from 'express';
import { AppError } from '../../lib/errors';
import { requireAuth } from '../../middleware/require-auth';
import { loginSchema, registerSchema } from './auth.schemas';
import { getUserById, loginUser, registerUser } from './auth.service';
import { clearAuthCookie, setAuthCookie } from './auth.tokens';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const user = await registerUser(registerSchema.parse(req.body));
    setAuthCookie(res, { userId: user.id, role: user.role });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const user = await loginUser(loginSchema.parse(req.body));
    setAuthCookie(res, { userId: user.id, role: user.role });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
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
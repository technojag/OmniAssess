import { Router } from 'express';
import { registerSchema } from './auth.schemas';
import { registerUser } from './auth.service';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});
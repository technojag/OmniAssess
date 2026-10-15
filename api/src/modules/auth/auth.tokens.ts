import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { config } from '../../config';

export type AuthPayload = { userId: string; role: 'CANDIDATE' | 'ADMIN' };

export function signAccessToken(p: AuthPayload) {
  return jwt.sign({ role: p.role }, config.jwtAccessSecret, {
    subject: p.userId,
    expiresIn: config.accessTtlSeconds,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AuthPayload | null {
  try {
    const d = jwt.verify(token, config.jwtAccessSecret, { algorithms: ['HS256'] });
    if (typeof d === 'string' || !d.sub) return null;
    return { userId: d.sub, role: d.role === 'ADMIN' ? 'ADMIN' : 'CANDIDATE' };
  } catch {
    return null;
  }
}

const cookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the page cannot read this cookie
  sameSite: 'lax',
  secure: config.isProd, // HTTPS only in production
  path: '/',
};

export function setAuthCookie(res: Response, p: AuthPayload) {
  res.cookie(config.cookieName, signAccessToken(p), {
    ...cookieOptions,
    maxAge: config.accessTtlSeconds * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(config.cookieName, cookieOptions);
}
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

const baseCookie: CookieOptions = {
  httpOnly: true, // JavaScript in the page cannot read this cookie
  sameSite: 'lax',
  secure: config.isProd, // HTTPS only in production
};

const accessCookie: CookieOptions = { ...baseCookie, path: '/' };
// The refresh cookie is only sent to the auth endpoints, not to every API call
const refreshCookie: CookieOptions = { ...baseCookie, path: '/api/v1/auth' };

export function setAuthCookie(res: Response, p: AuthPayload) {
  res.cookie(config.cookieName, signAccessToken(p), {
    ...accessCookie,
    maxAge: config.accessTtlSeconds * 1000,
  });
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(config.refreshCookieName, token, {
    ...refreshCookie,
    maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(config.cookieName, accessCookie);
  res.clearCookie(config.refreshCookieName, refreshCookie);
}
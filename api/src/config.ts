const secret = process.env.JWT_ACCESS_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('JWT_ACCESS_SECRET is missing or too short. Add it to api/.env (32+ characters).');
}

export const config = {
  jwtAccessSecret: secret,
  accessTtlSeconds: 15 * 60,
  refreshTtlDays: 30,
  cookieName: 'oa_access',
  refreshCookieName: 'oa_refresh',
  isProd: process.env.NODE_ENV === 'production',
};
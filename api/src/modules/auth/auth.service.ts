import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { config } from '../../config';
import { AppError } from '../../lib/errors';
import type { LoginInput, RegisterInput } from './auth.schemas';

// Never include passwordHash here
const publicUser = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  hasCompletedOnboarding: true,
} as const;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const notLoggedIn = () => new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.');

// Used when the email does not exist, so a wrong email takes about as long as a wrong password
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash('not-a-real-password'));

export async function registerUser(input: RegisterInput) {
  const passwordHash = await hash(input.password);

  try {
    return await prisma.user.create({
      data: { email: input.email, fullName: input.fullName, passwordHash },
      select: publicUser,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw e;
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await verify(user?.passwordHash ?? (await getDummyHash()), input.password);

  if (!user || !ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
  };
}

export function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUser });
}

// ---- Refresh tokens: random value for the browser, only its hash is stored ----

export async function issueRefreshToken(userId: string) {
  const token = randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + config.refreshTtlDays * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function rotateRefreshToken(token: string) {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: publicUser } },
  });
  if (!row) throw notLoggedIn();

  if (row.revokedAt) {
    // An already-used token came back: possible theft. Close every session of this user.
    await prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw notLoggedIn();
  }
  if (row.expiresAt < new Date()) throw notLoggedIn();

  // Revoke only if nobody else already did (guards against two requests at once)
  const done = await prisma.refreshToken.updateMany({
    where: { id: row.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (done.count !== 1) throw notLoggedIn();

  return { user: row.user, refreshToken: await issueRefreshToken(row.userId) };
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
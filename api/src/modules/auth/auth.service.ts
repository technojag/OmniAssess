import { hash, verify } from '@node-rs/argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db';
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
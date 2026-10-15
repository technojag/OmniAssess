import { hash } from '@node-rs/argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { AppError } from '../../lib/errors';
import type { RegisterInput } from './auth.schemas';

export async function registerUser(input: RegisterInput) {
  const passwordHash = await hash(input.password); // argon2id, salt is added automatically

  try {
    return await prisma.user.create({
      data: { email: input.email, fullName: input.fullName, passwordHash },
      // Never return passwordHash
      select: { id: true, email: true, fullName: true, role: true, hasCompletedOnboarding: true },
    });
  } catch (e) {
    // P2002 = unique constraint failed (email already exists)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw e;
  }
}
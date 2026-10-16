import type { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import type { OnboardingInput } from './onboarding.schemas';

const publicProfile = { category: true, details: true, focusNotes: true } as const;

export async function saveOnboarding(userId: string, input: OnboardingInput) {
  const { category, focusNotes, ...details } = input;
  const data = {
    category,
    details: details as Prisma.InputJsonObject,
    focusNotes: focusNotes ?? null,
  };

  // Profile and flag change together, or not at all
  return prisma.$transaction(async (tx) => {
    const profile = await tx.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      select: publicProfile,
    });
    await tx.user.update({ where: { id: userId }, data: { hasCompletedOnboarding: true } });
    return profile;
  });
}

export function getProfile(userId: string) {
  return prisma.userProfile.findUnique({ where: { userId }, select: publicProfile });
}
import { z } from 'zod';

export const startAttemptSchema = z.object({
  examSlug: z.string().trim().min(1).max(100),
  isPractice: z.boolean().optional().default(false),
});

export const attemptIdParam = z.object({ id: z.string().uuid('Invalid attempt id') });
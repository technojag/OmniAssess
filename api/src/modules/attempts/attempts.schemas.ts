import { z } from 'zod';

export const startAttemptSchema = z.object({
  examSlug: z.string().trim().min(1).max(100),
  isPractice: z.boolean().optional().default(false),
});

export const attemptIdParam = z.object({ id: z.string().uuid('Invalid attempt id') });

export const responseParams = z.object({
  id: z.string().uuid('Invalid attempt id'),
  attemptQuestionId: z.string().uuid('Invalid question id'),
});

// selectedOptionId: null clears the answer. Send at least one of the two fields.
export const saveResponseSchema = z
  .object({
    selectedOptionId: z.string().uuid().nullable().optional(),
    markedForReview: z.boolean().optional(),
  })
  .refine((v) => v.selectedOptionId !== undefined || v.markedForReview !== undefined, {
    message: 'Send selectedOptionId or markedForReview.',
  });
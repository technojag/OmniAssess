import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);
const focusNotes = text(300).optional();

// category is required, every other field is optional (as in the product blueprint)
export const onboardingSchema = z.discriminatedUnion('category', [
  z.object({
    category: z.literal('SCHOOL'),
    classLevel: z.enum(['10', '12']).optional(),
    board: z.enum(['CBSE', 'ICSE', 'STATE', 'OTHER']).optional(),
    subjects: z.array(text(40)).max(10).optional(),
    focusNotes,
  }),
  z.object({
    category: z.literal('COLLEGE'),
    degree: z.enum(['BTECH', 'BSC', 'BCOM', 'BA', 'OTHER']).optional(),
    semester: z.number().int().min(1).max(12).optional(),
    coreSubject: text(60).optional(),
    focusNotes,
  }),
  z.object({
    category: z.literal('GOVT_COMPETITIVE'),
    targetExam: z.enum(['UPSC', 'SSC_CGL', 'BANKING', 'RAILWAYS', 'OTHER']).optional(),
    section: text(40).optional(),
    focusNotes,
  }),
  z.object({
    category: z.literal('CORPORATE'),
    targetRole: text(60).optional(),
    experienceLevel: z.enum(['FRESHER', '0_2_YEARS', '2_5_YEARS', '5_PLUS_YEARS']).optional(),
    focusNotes,
  }),
]);

export type OnboardingInput = z.infer<typeof onboardingSchema>;
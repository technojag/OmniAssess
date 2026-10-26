import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const focusNotes = z.string().trim().max(300).optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();

// Semesters in each fixed degree. For "OTHER" the limit comes from courseYears (years x 2).
const SEMESTERS_BY_DEGREE = { BTECH: 8, BSC: 6, BCOM: 6, BA: 6 } as const;

// category and the fields the dashboard depends on are required; focusNotes (and GOVT "section") stay optional.
// The "...Other" fields are required only when the matching choice is OTHER (checked in superRefine below).
export const onboardingSchema = z
  .discriminatedUnion('category', [
    z.object({
      category: z.literal('SCHOOL'),
      classLevel: z.enum(['10', '12']),
      board: z.enum(['CBSE', 'ICSE', 'STATE', 'OTHER']),
      boardOther: optionalText(60),
      subjects: z.array(text(40)).min(1).max(10),
      focusNotes,
    }),
    z.object({
      category: z.literal('COLLEGE'),
      degree: z.enum(['BTECH', 'BSC', 'BCOM', 'BA', 'OTHER']),
      degreeOther: optionalText(60),
      courseYears: z.number().int().min(1).max(6).optional(),
      semester: z.number().int().min(1).max(12),
      coreSubject: text(60),
      focusNotes,
    }),
    z.object({
      category: z.literal('GOVT_COMPETITIVE'),
      targetExam: z.enum(['UPSC', 'SSC_CGL', 'BANKING', 'RAILWAYS', 'OTHER']),
      targetExamOther: optionalText(60),
      section: optionalText(40),
      focusNotes,
    }),
    z.object({
      category: z.literal('CORPORATE'),
      targetRole: text(60),
      experienceLevel: z.enum(['FRESHER', '0_2_YEARS', '2_5_YEARS', '5_PLUS_YEARS']),
      focusNotes,
    }),
  ])
  .superRefine((data, ctx) => {
    const missing = (field: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });

    if (data.category === 'SCHOOL' && data.board === 'OTHER' && !data.boardOther) {
      missing('boardOther', 'Enter your board name');
    }

    if (data.category === 'GOVT_COMPETITIVE' && data.targetExam === 'OTHER' && !data.targetExamOther) {
      missing('targetExamOther', 'Enter your target exam name');
    }

    if (data.category === 'COLLEGE') {
      let maxSemester = 12;
      if (data.degree === 'OTHER') {
        if (!data.degreeOther) missing('degreeOther', 'Enter your course name');
        if (!data.courseYears) missing('courseYears', 'Select your course duration');
        else maxSemester = data.courseYears * 2;
      } else {
        maxSemester = SEMESTERS_BY_DEGREE[data.degree];
      }
      if (data.semester > maxSemester) {
        missing('semester', 'Semester is more than this course has');
      }
    }
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
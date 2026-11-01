import { z } from 'zod';
import { prisma } from '../../db';

const submissionSchema = z.object({ allowEarlySubmit: z.boolean().default(true) });
const proctoringSchema = z.object({ cameraRequired: z.boolean().default(false) });

// Reads these exam rules from the template:
//   rules.submission.allowEarlySubmit  (missing means true)
//   rules.proctoring.cameraRequired    (missing means false)
// so older templates keep working exactly as before.
export function resolveSubmitPolicy(rules: unknown) {
  const raw = (rules ?? {}) as { submission?: unknown; proctoring?: unknown };
  const submission = submissionSchema.safeParse(raw.submission ?? {});
  const proctoring = proctoringSchema.safeParse(raw.proctoring ?? {});
  return {
    allowEarlySubmit: submission.success ? submission.data.allowEarlySubmit : true,
    cameraRequired: proctoring.success ? proctoring.data.cameraRequired : false,
  };
}

export async function loadSubmitPolicy(templateVersionId: string) {
  const row = await prisma.examTemplateVersion.findUnique({
    where: { id: templateVersionId },
    select: { rules: true },
  });
  return resolveSubmitPolicy(row?.rules);
}
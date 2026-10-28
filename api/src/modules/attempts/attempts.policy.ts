import { z } from 'zod';
import { prisma } from '../../db';

const schema = z.object({ allowEarlySubmit: z.boolean().default(true) });

// Reads template rules -> submission -> allowEarlySubmit.
// If the template does not say anything, early submit stays allowed, so older templates keep working.
export function resolveSubmitPolicy(rules: unknown) {
  const raw = (rules as { submission?: unknown } | null)?.submission;
  const parsed = schema.safeParse(raw ?? {});
  return { allowEarlySubmit: parsed.success ? parsed.data.allowEarlySubmit : true };
}

export async function loadSubmitPolicy(templateVersionId: string) {
  const row = await prisma.examTemplateVersion.findUnique({
    where: { id: templateVersionId },
    select: { rules: true },
  });
  return resolveSubmitPolicy(row?.rules);
}
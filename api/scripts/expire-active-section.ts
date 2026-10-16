import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const attemptId = process.argv[2];
  if (!attemptId) throw new Error('Usage: npx tsx scripts/expire-active-section.ts <attemptId>');
  const r = await prisma.attemptSection.updateMany({
    where: { attemptId, state: 'ACTIVE' },
    data: { deadlineAt: new Date(Date.now() - 60_000) },
  });
  console.log('Sections moved to the past:', r.count);
}

main().finally(() => prisma.$disconnect());
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [attemptId, c, w] = process.argv.slice(2);
  const nCorrect = Number(c);
  const nWrong = Number(w);
  if (!attemptId || Number.isNaN(nCorrect) || Number.isNaN(nWrong)) {
    throw new Error('Usage: npx tsx scripts/answer-active-section.ts <attemptId> <howManyCorrect> <howManyWrong>');
  }

  const section = await prisma.attemptSection.findFirst({ where: { attemptId, state: 'ACTIVE' } });
  if (!section) throw new Error('No active section in this attempt.');

  const items = await prisma.attemptQuestion.findMany({
    where: { attemptSectionId: section.id },
    orderBy: { position: 'asc' },
    include: { question: { include: { options: true } } },
  });

  let i = 0;
  for (const item of items) {
    const right = item.question.options.find((o) => o.isCorrect)!;
    const wrong = item.question.options.find((o) => !o.isCorrect)!;
    const pick = i < nCorrect ? right : i < nCorrect + nWrong ? wrong : null;
    i++;
    if (!pick) continue;
    await prisma.response.upsert({
      where: { attemptQuestionId: item.id },
      create: { attemptQuestionId: item.id, selectedOptionId: pick.id },
      update: { selectedOptionId: pick.id },
    });
  }
  console.log(`Section ${section.position}: ${nCorrect} correct, ${nWrong} wrong, rest left blank.`);
}

main().finally(() => prisma.$disconnect());
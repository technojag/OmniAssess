import { PrismaClient, Category, VersionStatus, QuestionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// [question stem, options, index of the correct option]
type Q = [string, string[], number];

const BANK: Record<string, Q[]> = {
  Reasoning: [
    ['Find the odd one out.', ['Apple', 'Mango', 'Potato', 'Banana'], 2],
    ['Find the missing number: 2, 6, 12, 20, 30, ?', ['36', '40', '42', '44'], 2],
    ['If CAT is coded as DBU, how is DOG coded?', ['EPH', 'DPH', 'EOH', 'FQJ'], 0],
    ['A is the sister of B. B is the father of C. How is A related to C?', ['Mother', 'Aunt', 'Cousin', 'Grandmother'], 1],
    ['A man walks 4 km north then 3 km east. How far is he from the start?', ['5 km', '7 km', '6 km', '4 km'], 0],
  ],
  'General Awareness': [
    ['Who is known as the Father of the Indian Constitution?', ['Mahatma Gandhi', 'B. R. Ambedkar', 'J. Nehru', 'S. Patel'], 1],
    ['What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2],
    ['Which gas is most abundant in the atmosphere?', ['Oxygen', 'Nitrogen', 'Argon', 'Carbon dioxide'], 1],
    ['Fundamental Rights are in which Part of the Constitution?', ['Part II', 'Part III', 'Part IV', 'Part V'], 1],
    ['Which planet is known as the Red Planet?', ['Venus', 'Jupiter', 'Mars', 'Mercury'], 2],
  ],
  'Quantitative Aptitude': [
    ['What is 15% of 200?', ['20', '25', '30', '35'], 2],
    ['Find the average of 10, 20, 30 and 40.', ['20', '25', '30', '35'], 1],
    ['A train at 60 km/h runs for 2.5 hours. Distance covered?', ['120 km', '140 km', '150 km', '160 km'], 2],
    ['Simplify: 12 × 5 − 20 ÷ 4', ['55', '40', '10', '45'], 0],
    ['Cost price Rs 800, profit 25%. Selling price?', ['Rs 900', 'Rs 1000', 'Rs 1050', 'Rs 960'], 1],
  ],
  English: [
    ['Choose the synonym of RAPID.', ['Slow', 'Swift', 'Weak', 'Calm'], 1],
    ['Choose the antonym of ANCIENT.', ['Old', 'Modern', 'Historic', 'Classic'], 1],
    ['He ___ to school every day.', ['go', 'going', 'goes', 'gone'], 2],
    ['One word for: a person who loves books.', ['Bibliophile', 'Philatelist', 'Linguist', 'Historian'], 0],
    ['Select the correctly spelt word.', ['Accomodation', 'Acommodation', 'Accommodation', 'Acomodation'], 2],
  ],
};

async function main() {
  // 1. Subjects and questions (skip anything that already exists)
  const subjectIds: Record<string, string> = {};
  for (const name of Object.keys(BANK)) {
    const subject = await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
    subjectIds[name] = subject.id;

    for (const [stem, options, correctIndex] of BANK[name]) {
      const exists = await prisma.question.findFirst({ where: { subjectId: subject.id, stem } });
      if (exists) continue;
      await prisma.question.create({
        data: {
          subjectId: subject.id,
          stem,
          status: QuestionStatus.APPROVED,
          options: {
            create: options.map((text, i) => ({ position: i + 1, text, isCorrect: i === correctIndex })),
          },
        },
      });
    }
  }

  // 2. Exam template = pure data. The engine reads this; no exam name appears in engine code.
  const template = await prisma.examTemplate.upsert({
    where: { slug: 'ssc-cgl-full' },
    update: {},
    create: {
      slug: 'ssc-cgl-full',
      name: 'SSC CGL — Full Exam Simulation',
      category: Category.GOVT_COMPETITIVE,
      description: 'Four timed sections. Each section locks automatically when its timer ends.',
    },
  });

  const version = await prisma.examTemplateVersion.upsert({
    where: { templateId_version: { templateId: template.id, version: 1 } },
    update: {},
    create: {
      templateId: template.id,
      version: 1,
      status: VersionStatus.PUBLISHED,
      publishedAt: new Date(),
      rules: { transition: 'REQUIRE_CONTINUE', maxWarnings: 3 },
    },
  });

  const order = ['Reasoning', 'General Awareness', 'Quantitative Aptitude', 'English'];
  for (const [i, name] of order.entries()) {
    await prisma.examSection.upsert({
      where: { templateVersionId_position: { templateVersionId: version.id, position: i + 1 } },
      update: {},
      create: {
        templateVersionId: version.id,
        position: i + 1,
        name,
        subjectId: subjectIds[name],
        durationSeconds: 15 * 60,
        questionCount: 5, // raise to 25 once the question bank is bigger
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        allowReturnToPrevious: false,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
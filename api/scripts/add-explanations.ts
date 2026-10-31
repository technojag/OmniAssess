import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// [start of the question text, solution]. Only questions that have no solution yet are updated.
const EXPLANATIONS: [string, string][] = [
  ['Find the odd one out.', 'Apple, mango and banana are fruits, but potato is a vegetable.'],
  ['Find the missing number: 2, 6, 12', 'The differences are 4, 6, 8, 10, so the next difference is 12 and the number is 30 + 12 = 42.'],
  ['If CAT is coded as DBU', 'Each letter moves one step forward: C to D, A to B, T to U. So D, O, G becomes E, P, H.'],
  ['A is the sister of B', 'B is the father of C, so A, who is the sister of B, is the aunt of C.'],
  ['A man walks 4 km north', 'By the right-angled triangle rule, the distance is the square root of 16 + 9 = 5 km.'],
  ['Who is known as the Father of the Indian Constitution', 'B. R. Ambedkar chaired the Drafting Committee of the Constituent Assembly.'],
  ['What is the capital of Australia', 'Canberra is the capital. It was chosen in 1908 as a compromise between Sydney and Melbourne.'],
  ['Which gas is most abundant', 'Nitrogen makes up about 78% of the air.'],
  ['Fundamental Rights are in which Part', 'Fundamental Rights are in Part III of the Constitution (Articles 12 to 35).'],
  ['Which planet is known as the Red Planet', 'Mars looks red because of iron oxide (rust) on its surface.'],
  ['What is 15% of 200', '15% of 200 = 15 x 200 / 100 = 30.'],
  ['Find the average of 10, 20, 30 and 40', 'The sum is 100, and 100 divided by 4 is 25.'],
  ['A train at 60 km/h', 'Distance = speed x time = 60 x 2.5 = 150 km.'],
  ['Simplify: 12', 'Follow BODMAS: 12 x 5 = 60 and 20 / 4 = 5, so 60 - 5 = 55.'],
  ['Cost price Rs 800', 'Selling price = 800 + 25% of 800 = 800 + 200 = Rs 1000.'],
  ['Choose the synonym of RAPID', 'Swift means fast, the same as rapid.'],
  ['Choose the antonym of ANCIENT', 'Modern is the opposite of ancient.'],
  ['He ___ to school every day', 'With the singular subject "he" in the present tense, the verb takes -es: goes.'],
  ['One word for: a person who loves books', 'A bibliophile is a person who loves books.'],
  ['Select the correctly spelt word', 'Accommodation is spelt with a double c and a double m.'],
];

async function main() {
  let updated = 0;
  for (const [start, explanation] of EXPLANATIONS) {
    const r = await prisma.question.updateMany({
      where: { stem: { startsWith: start }, explanation: null },
      data: { explanation },
    });
    updated += r.count;
    if (r.count === 0) console.log('Nothing to update for: ' + start);
  }
  console.log('Solutions added to ' + updated + ' questions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
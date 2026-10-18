import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api/v1';
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
let cookie = '';

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null, res };
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) throw new Error('Usage: npx tsx scripts/timing-demo.ts <email> <password>');

  const login = await call('POST', '/auth/login', { email, password });
  if (login.status !== 200) throw new Error(`Login failed (${login.status})`);
  cookie = login.res.headers.getSetCookie().find((c) => c.startsWith('oa_access='))!.split(';')[0];

  const start = await call('POST', '/attempts', { examSlug: 'ssc-cgl-full' });
  if (start.status !== 201) throw new Error(`Could not start a NEW exam (status ${start.status}). Finish the running exam first.`);
  const id: string = start.json.attempt.id;
  console.log('New attempt:', id);

  // Dev shortcut: let sections 1-3 run out, then continue
  for (let i = 1; i <= 3; i++) {
    await prisma.attemptSection.updateMany({
      where: { attemptId: id, state: 'ACTIVE' },
      data: { deadlineAt: new Date(Date.now() - 60_000) },
    });
    const c = await call('POST', `/attempts/${id}/continue`);
    if (c.status !== 200) throw new Error(`Continue failed (${c.status})`);
  }

  const view = await call('GET', `/attempts/${id}`);
  const q: { attemptQuestionId: string }[] = view.json.currentSection.questions;
  console.log('Section 4 is active, with', q.length, 'questions. Moving between questions...');

  const open = (n: number) => call('POST', `/attempts/${id}/events/view`, { attemptQuestionId: q[n].attemptQuestionId });
  await open(0);
  await sleep(3);
  await open(1);
  await sleep(4);
  await open(0);
  await sleep(2);

  const early = await call('GET', `/attempts/${id}/timing`);
  console.log('Timing while the exam is running ->', early.status, early.json?.error?.code);

  // A question from section 1 is locked now, so recording it must be refused
  const locked = await prisma.attemptQuestion.findFirst({
    where: { attemptId: id, attemptSection: { position: 1 } },
    select: { id: true },
  });
  const refused = await call('POST', `/attempts/${id}/events/view`, { attemptQuestionId: locked!.id });
  console.log('Recording a locked-section question ->', refused.status, refused.json?.error?.code);

  const submit = await call('POST', `/attempts/${id}/submit`);
  console.log('Submit ->', submit.status);

  const t = await call('GET', `/attempts/${id}/timing`);
  console.log('Timing after the exam ->', t.status);
  const s4 = t.json.sections.find((s: { position: number }) => s.position === 4);
  console.log(`Section 4: used ${s4.usedSeconds}s of ${s4.allottedSeconds}s`);
  for (const x of s4.questions) console.log(`  Q${x.position}: ${x.seconds}s, ${x.visits} visit(s)`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
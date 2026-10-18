import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api/v1';
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

const undoLine = (j: { attempt: { status: string }; undo: { available: boolean; reason: string | null; secondsLeft: number; undosLeft: number } }) =>
  `status=${j.attempt.status} undo available=${j.undo.available} secondsLeft=${j.undo.secondsLeft} undosLeft=${j.undo.undosLeft}` +
  (j.undo.reason ? ` reason=${j.undo.reason}` : '');

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) throw new Error('Usage: npx tsx scripts/undo-demo.ts <email> <password>');

  const login = await call('POST', '/auth/login', { email, password });
  if (login.status !== 200) throw new Error(`Login failed (${login.status})`);
  cookie = login.res.headers.getSetCookie().find((c) => c.startsWith('oa_access='))!.split(';')[0];

  const start = await call('POST', '/attempts', { examSlug: 'ssc-cgl-full' });
  if (start.status !== 201) throw new Error(`Could not start a NEW exam (status ${start.status}). Finish the running exam first.`);
  const id: string = start.json.attempt.id;
  console.log('New attempt:', id);

  // Dev shortcut: let sections 1-3 run out, then continue, so we are in the last section
  for (let i = 1; i <= 3; i++) {
    await prisma.attemptSection.updateMany({
      where: { attemptId: id, state: 'ACTIVE' },
      data: { deadlineAt: new Date(Date.now() - 60_000) },
    });
    const c = await call('POST', `/attempts/${id}/continue`);
    if (c.status !== 200) throw new Error(`Continue failed (${c.status})`);
  }

  const early = await call('POST', `/attempts/${id}/undo`);
  console.log('Undo while the exam is running ->', early.status, early.json?.error?.code);

  const s1 = await call('POST', `/attempts/${id}/submit`);
  console.log('Submit #1 ->', s1.status, undoLine(s1.json));

  const peek = await call('GET', `/attempts/${id}/summary`);
  console.log('Summary inside the undo window ->', peek.status, peek.json?.error?.code);

  const u1 = await call('POST', `/attempts/${id}/undo`);
  const sec4 = u1.json.sections.find((s: { position: number }) => s.position === 4);
  console.log(
    'Undo #1 ->', u1.status, `undone=${u1.json.undone} undosLeft=${u1.json.undosLeft}`,
    `warnings=${u1.json.attempt.warningCount} integrity=${u1.json.attempt.integrityScore} section4=${sec4.state}`,
  );

  const s2 = await call('POST', `/attempts/${id}/submit`);
  console.log('Submit #2 ->', s2.status, undoLine(s2.json));

  const u2 = await call('POST', `/attempts/${id}/undo`);
  console.log(
    'Undo #2 ->', u2.status, `undone=${u2.json.undone} undosLeft=${u2.json.undosLeft}`,
    `warnings=${u2.json.attempt.warningCount} integrity=${u2.json.attempt.integrityScore}`,
  );

  const s3 = await call('POST', `/attempts/${id}/submit`);
  console.log('Submit #3 ->', s3.status, undoLine(s3.json));

  const u3 = await call('POST', `/attempts/${id}/undo`);
  console.log('Undo #3 ->', u3.status, u3.json?.error?.code);

  const summary = await call('GET', `/attempts/${id}/summary`);
  console.log('Summary now ->', summary.status, summary.json.attempt.status, `${summary.json.score}/${summary.json.maxScore}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
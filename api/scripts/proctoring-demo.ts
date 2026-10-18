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

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) throw new Error('Usage: npx tsx scripts/proctoring-demo.ts <email> <password>');

  const login = await call('POST', '/auth/login', { email, password });
  if (login.status !== 200) throw new Error(`Login failed (${login.status})`);
  cookie = login.res.headers.getSetCookie().find((c) => c.startsWith('oa_access='))!.split(';')[0];

  const start = await call('POST', '/attempts', { examSlug: 'ssc-cgl-full' });
  if (start.status !== 201) throw new Error(`Could not start a NEW exam (status ${start.status}). Finish the running exam first.`);
  const id: string = start.json.attempt.id;
  console.log('New attempt:', id);
  console.log('Start: warnings', start.json.attempt.warningCount, 'integrity', start.json.attempt.integrityScore);

  const steps: Array<[string, string]> = [
    ['TAB_SWITCH', 'first tab switch'],
    ['TAB_SWITCH', 'same again, right away'],
    ['HANDS_HIDDEN', 'hands hidden'],
    ['FULLSCREEN_EXIT', 'left fullscreen'],
    ['FACE_MISSING', 'face missing'],
  ];

  for (const [kind, label] of steps) {
    const r = await call('POST', `/attempts/${id}/events/violation`, { kind });
    const j = r.json;
    console.log(
      `${label} (${kind}) -> ${r.status} counted=${j.counted}` +
        (j.reason ? ` reason=${j.reason}` : '') +
        ` warnings=${j.warningCount}/${j.maxWarnings} integrity=${j.integrityScore} terminated=${j.terminated}`,
    );
  }

  const after = await call('POST', `/attempts/${id}/events/violation`, { kind: 'TAB_SWITCH' });
  console.log('Violation after termination ->', after.status, after.json?.error?.code);

  const summary = await call('GET', `/attempts/${id}/summary`);
  console.log('Summary ->', summary.status, summary.json.attempt.status, `${summary.json.score}/${summary.json.maxScore}`);

  const log = await call('GET', `/attempts/${id}/proctoring`);
  console.log('Proctoring log ->', log.status, `status=${log.json.status}`, `warnings=${log.json.warningCount}`, `integrity=${log.json.integrityScore}`);
  for (const e of log.json.events) console.log(`  ${e.type} ${e.kind ?? e.reason ?? ''}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
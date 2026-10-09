process.env.NODE_ENV = 'test';
process.env.RL_AUTH_MAX = '3';
process.env.RL_GLOBAL_MAX = '100000';
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let s; let base;
test.before(() => { s = app.listen(0); base = `http://127.0.0.1:${s.address().port}`; });
test.after(() => s.close());

test('health works without a DB, unknown routes 404 as JSON, protected routes 401', async () => {
  assert.equal((await (await fetch(`${base}/api/health`)).json()).status, 'ok');
  const n = await fetch(`${base}/api/nope`); assert.equal(n.status, 404); assert.equal((await n.json()).code, 'NOT_FOUND');
  assert.equal((await fetch(`${base}/api/captcha/current`)).status, 401);
});

test('rate limiter: 4th login attempt inside the window returns 429 RATE_LIMITED', async () => {
  const hit = () => fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const codes = [];
  for (let i = 0; i < 4; i += 1) codes.push((await hit()).status);
  assert.deepEqual(codes, [400, 400, 400, 429]); // 400 = validation (limiter let it through), 429 = blocked
});

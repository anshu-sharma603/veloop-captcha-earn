/**
 * Integration tests. Need MongoDB:
 *   - set TEST_MONGO_URI to a *replica-set* URI (e.g. a free Atlas test DB), or
 *   - leave it unset and mongodb-memory-server will download & start one (needs internet).
 * These tests mutate the target DB: NEVER point them at real data.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.RL_VERIFY_MAX = '1000'; process.env.RL_CLAIM_MAX = '1000'; process.env.RL_NEW_MAX = '1000';
process.env.RL_CURRENT_MAX = '1000'; process.env.RL_GLOBAL_MAX = '100000'; process.env.RL_AUTH_MAX = '1000';

const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet');
const CaptchaChallenge = require('../src/models/CaptchaChallenge');
const CaptchaAttempt = require('../src/models/CaptchaAttempt');
const GemTransaction = require('../src/models/GemTransaction');
const CaptchaRewardConfig = require('../src/models/CaptchaRewardConfig');
require('../src/models/AuditLog');

let server; let base; let mem; let A; let B;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}
async function makeUser(email) {
  const u = await User.create({ name: email, email, passwordHash: await bcrypt.hash('Passw0rd!', 4) });
  await Wallet.create({ userId: u._id, balanceMilli: 100000 });
  const login = await api('POST', '/api/auth/login', { body: { email, password: 'Passw0rd!' } });
  return { id: String(u._id), token: login.body.token };
}
const balance = async (u) => (await api('GET', '/api/wallet/gems', { token: u.token })).body.balance.amount;
const secret = (id) => CaptchaChallenge.findOne({ challengeId: id }).select('+correctOption');
async function fresh(u) { return (await api('GET', '/api/captcha/current', { token: u.token })).body.challenge; }
async function wrongOption(ch) { const s = await secret(ch.challengeId); return ch.options.find((o) => o !== s.correctOption); }

test.before(async () => {
  let uri = process.env.TEST_MONGO_URI;
  if (!uri) {
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    mem = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = mem.getUri();
  }
  await connectDB(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  await CaptchaRewardConfig.create({ key: 'default', correctRewardMilli: 1000, wrongRewardMilli: 500 });
  server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`;
  A = await makeUser('a@veloop.test'); B = await makeUser('b@veloop.test');
});
test.after(async () => { server?.close(); await mongoose.disconnect(); await mem?.stop(); });

test('GET /current returns 4 options and never the correct answer', async () => {
  const r = await api('GET', '/api/captcha/current', { token: A.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.challenge.options.length, 4);
  const json = JSON.stringify(r.body);
  assert.ok(!('correctOption' in r.body.challenge));
  assert.ok(!/correctOption/.test(json));
});

test('unauthorized requests are rejected', async () => {
  assert.equal((await api('GET', '/api/captcha/current')).status, 401);
  assert.equal((await api('POST', '/api/captcha/verify', { body: {} })).status, 401);
});

test('correct answer => CORRECT, +1 pending, balance unchanged until claim, claim credits exactly once', async () => {
  const ch = await fresh(A); const s = await secret(ch.challengeId);
  const v = await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  assert.equal(v.status, 200); assert.equal(v.body.result, 'CORRECT'); assert.equal(v.body.reward.amount, 1);
  const before = await balance(A);
  const claims = await Promise.all(Array.from({ length: 10 }, () => api('POST', '/api/captcha/claim', { token: A.token, body: { challengeId: ch.challengeId } })));
  assert.equal(claims.filter((c) => c.status === 200).length, 1, 'exactly one claim succeeds');
  assert.ok(claims.filter((c) => c.status !== 200).every((c) => c.body.code === 'REWARD_ALREADY_CLAIMED'));
  assert.equal(await balance(A), before + 1);
  assert.equal(await GemTransaction.countDocuments({ referenceId: ch.challengeId }), 1);
  const tx = await GemTransaction.findOne({ referenceId: ch.challengeId });
  assert.equal(tx.balanceAfterMilli - tx.balanceBeforeMilli, 1000);
});

test('wrong answer => WRONG, +0.5 Gems after claim (fractional exact)', async () => {
  const ch = await fresh(A); const before = await balance(A);
  const v = await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: await wrongOption(ch) } });
  assert.equal(v.body.result, 'WRONG'); assert.equal(v.body.reward.amount, 0.5);
  const c = await api('POST', '/api/captcha/claim', { token: A.token, body: { challengeId: ch.challengeId } });
  assert.equal(c.status, 200);
  assert.equal(await balance(A), before + 0.5);
});

test('MANDATORY: concurrent verify of one challenge => one result, one attempt, never +2', async () => {
  const ch = await fresh(A); const s = await secret(ch.challengeId);
  const rs = await Promise.all(Array.from({ length: 20 }, () => api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } })));
  assert.equal(rs.filter((r) => r.status === 200).length, 1);
  assert.ok(rs.filter((r) => r.status !== 200).every((r) => r.body.code === 'CHALLENGE_ALREADY_COMPLETED'));
  assert.equal(await CaptchaAttempt.countDocuments({ challengeId: ch.challengeId }), 1);
  const before = await balance(A);
  await api('POST', '/api/captcha/claim', { token: A.token, body: { challengeId: ch.challengeId } });
  assert.equal(await balance(A), before + 1);
});

test('duplicate verification fails with CHALLENGE_ALREADY_COMPLETED', async () => {
  const ch = await fresh(A); const s = await secret(ch.challengeId);
  await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  const again = await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  assert.equal(again.status, 409); assert.equal(again.body.code, 'CHALLENGE_ALREADY_COMPLETED');
  await api('POST', '/api/captcha/new', { token: A.token, body: {} });
});

test('fake reward + fake isCorrect + fake userId are ignored', async () => {
  const ch = await fresh(A); const wrong = await wrongOption(ch);
  const v = await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: wrong, reward: 100000, isCorrect: true, userId: B.id } });
  assert.equal(v.status, 200); assert.equal(v.body.result, 'WRONG'); assert.equal(v.body.reward.amount, 0.5);
  const doc = await CaptchaChallenge.findOne({ challengeId: ch.challengeId });
  assert.equal(String(doc.userId), A.id); assert.equal(doc.rewardAmountMilli, 500);
  await api('POST', '/api/captcha/new', { token: A.token, body: {} });
});

test('another user cannot verify or claim my challenge (404, no reward)', async () => {
  const ch = await fresh(A); const s = await secret(ch.challengeId); const bBefore = await balance(B);
  const v = await api('POST', '/api/captcha/verify', { token: B.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  assert.equal(v.status, 404);
  const c = await api('POST', '/api/captcha/claim', { token: B.token, body: { challengeId: ch.challengeId } });
  assert.equal(c.status, 404);
  assert.equal(await balance(B), bBefore);
});

test('invalid / missing option and bad challenge id', async () => {
  const ch = await fresh(A);
  assert.equal((await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: 'ZZZZZZ' } })).body.code, 'INVALID_OPTION');
  assert.equal((await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId } })).body.code, 'VALIDATION_ERROR');
  assert.equal((await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: 'CAP-0000000000', selectedOption: 'ABCDEF' } })).body.code, 'CHALLENGE_NOT_FOUND');
});

test('expired challenge is rejected and creates no reward', async () => {
  const ch = await fresh(A); const s = await secret(ch.challengeId);
  await CaptchaChallenge.updateOne({ challengeId: ch.challengeId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const before = await balance(A); const txBefore = await GemTransaction.countDocuments({ userId: A.id });
  const v = await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  assert.equal(v.status, 410); assert.equal(v.body.code, 'CHALLENGE_EXPIRED');
  assert.equal(await balance(A), before); assert.equal(await GemTransaction.countDocuments({ userId: A.id }), txBefore);
});

test('No Thanks: /new closes old challenge for good and forfeits the pending reward', async () => {
  const ch = await fresh(A); const s = await secret(ch.challengeId);
  await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  const n = await api('POST', '/api/captcha/new', { token: A.token, body: {} });
  assert.equal(n.status, 201); assert.notEqual(n.body.challenge.challengeId, ch.challengeId);
  const claim = await api('POST', '/api/captcha/claim', { token: A.token, body: { challengeId: ch.challengeId } });
  assert.equal(claim.body.code, 'REWARD_DECLINED');
  const replay = await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  assert.equal(replay.body.code, 'CHALLENGE_ALREADY_COMPLETED');
});

test('refresh before claiming resumes the pending result, not a new challenge', async () => {
  await api('POST', '/api/captcha/new', { token: A.token, body: {} });
  const ch = await fresh(A); const s = await secret(ch.challengeId);
  await api('POST', '/api/captcha/verify', { token: A.token, body: { challengeId: ch.challengeId, selectedOption: s.correctOption } });
  const cur = await api('GET', '/api/captcha/current', { token: A.token });
  assert.equal(cur.body.state, 'RESULT'); assert.equal(cur.body.result.challengeId, ch.challengeId);
});

test('history is own-only and never leaks answers; ?userId= is ignored', async () => {
  const r = await api('GET', `/api/captcha/history?userId=${B.id}`, { token: A.token });
  assert.equal(r.status, 200); assert.ok(r.body.items.length > 0);
  assert.ok(!/correctOption|captchaText|options/.test(JSON.stringify(r.body)));
  const ids = r.body.items.map((i) => i.challengeId);
  const owners = await CaptchaChallenge.find({ challengeId: { $in: ids } }).distinct('userId');
  assert.deepEqual(owners.map(String), [A.id]);
});

test('simultaneous /current calls never create two active challenges', async () => {
  const C = await makeUser('c@veloop.test');
  await Promise.all(Array.from({ length: 15 }, () => api('GET', '/api/captcha/current', { token: C.token })));
  assert.equal(await CaptchaChallenge.countDocuments({ userId: C.id, status: 'ACTIVE' }), 1);
});

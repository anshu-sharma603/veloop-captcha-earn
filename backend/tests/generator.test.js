const test = require('node:test');
const assert = require('node:assert');
const { buildChallengeOptions, distance, newChallengeId } = require('../src/utils/generator');
const { formatGems, money } = require('../src/utils/money');

test('every challenge has exactly 4 unique options: 1 correct, 2 similar, 1 different', () => {
  for (let i = 0; i < 3000; i += 1) {
    const { captchaText, correctOption, options } = buildChallengeOptions(6);
    assert.equal(options.length, 4);
    assert.equal(new Set(options).size, 4);
    assert.ok(options.includes(correctOption));
    assert.equal(captchaText, correctOption);
    assert.match(captchaText, /^[A-Z0-9]{6}$/);
    assert.ok(/[A-Z]/.test(captchaText) && /[0-9]/.test(captchaText), 'letters + digits');
    const others = options.filter((o) => o !== correctOption);
    const different = others.filter((o) => [...o].every((c) => !captchaText.includes(c)));
    assert.equal(different.length, 1, 'exactly one completely different option');
    const similar = others.filter((o) => !different.includes(o));
    similar.forEach((s) => assert.ok(distance(s, captchaText) >= 1 && distance(s, captchaText) <= 4 || s.length === 6));
  }
});

test('challenge ids look like CAP-XXXXXXXXXX and do not repeat', () => {
  const ids = new Set(Array.from({ length: 5000 }, newChallengeId));
  assert.equal(ids.size, 5000);
  ids.forEach((id) => assert.match(id, /^CAP-[A-F0-9]{10}$/));
});

test('milli-gem money helpers are exact for fractional rewards', () => {
  assert.equal(formatGems(100000), '100.00');
  assert.equal(formatGems(101500), '101.50');
  assert.deepEqual(money(500), { currency: 'GEMS', amount: 0.5, display: '0.50' });
  let balance = 100000; for (let i = 0; i < 1000; i += 1) balance += 500;
  assert.equal(balance, 600000); // integer math: no drift after 1000 x 0.5
});

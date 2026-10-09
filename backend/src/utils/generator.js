const crypto = require('crypto');

// No I / O / 0 / 1 so humans are never asked to guess ambiguous glyphs.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;

// Visually confusable pairs used to build "reasonably similar" wrong options.
const LOOKALIKE = {
  B: '8', '8': 'B', S: '5', '5': 'S', Z: '2', '2': 'Z', G: '6', '6': 'G',
  U: 'V', V: 'U', M: 'N', N: 'M', E: 'F', F: 'E', D: 'P', P: 'D',
  K: 'X', X: 'K', Q: 'G', W: 'V', '9': 'P', '7': 'T', T: '7', A: '4', '4': 'A',
};

const rnd = (n) => crypto.randomInt(0, n);
const pick = (str) => str[rnd(str.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random letters+digits code with at least 2 letters and 2 digits (CSPRNG). */
function generateCode(length = 6) {
  for (;;) {
    let s = '';
    for (let i = 0; i < length; i += 1) s += pick(ALPHABET);
    const letters = (s.match(/[A-Z]/g) || []).length;
    if (letters >= 2 && length - letters >= 2) return s;
  }
}

function mutateSimilar(code) {
  const chars = code.split('');
  const strategy = rnd(3);
  if (strategy === 0) {
    const i = rnd(chars.length - 1); // swap neighbours: A7K2P9 -> A7K29P
    [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
  } else if (strategy === 1) {
    const i = rnd(chars.length); // lookalike glyph
    const c = chars[i];
    chars[i] = LOOKALIKE[c] || pick(/[A-Z]/.test(c) ? LETTERS : DIGITS);
  } else {
    const idx = shuffle([...chars.keys()]).slice(0, 2); // two same-class substitutions
    idx.forEach((i) => {
      chars[i] = pick(/[A-Z]/.test(chars[i]) ? LETTERS : DIGITS);
    });
  }
  return chars.join('');
}

const distance = (a, b) => [...a].reduce((n, ch, i) => n + (ch === b[i] ? 0 : 1), 0);

/** Completely different: shares no character with the real code. */
function generateDifferent(code) {
  for (;;) {
    const c = generateCode(code.length);
    if ([...c].every((ch) => !code.includes(ch))) return c;
  }
}

/**
 * Exactly 4 unique options: 1 correct, 2 similar-but-wrong, 1 completely different.
 * Order is shuffled with a CSPRNG so position never leaks the answer.
 */
function buildChallengeOptions(length = 6) {
  const correct = generateCode(length);
  const used = new Set([correct]);
  const similar = [];
  let guard = 0;
  while (similar.length < 2) {
    guard += 1;
    const m = mutateSimilar(correct);
    const d = distance(m, correct);
    if (!used.has(m) && (guard > 200 || (d >= 1 && d <= 4))) {
      used.add(m);
      similar.push(m);
    }
  }
  let different = generateDifferent(correct);
  while (used.has(different)) different = generateDifferent(correct);
  return { captchaText: correct, correctOption: correct, options: shuffle([correct, ...similar, different]) };
}

function newChallengeId() {
  return `CAP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`; // 40 random bits
}

/** Optional image mode: SVG data-URI so the plain text is not present in JSON / DOM text. */
function renderSvgDataUri(text) {
  const w = 300; const h = 96; const gap = w / (text.length + 1);
  const glyphs = [...text].map((ch, i) => {
    const x = (gap * (i + 1)).toFixed(1);
    const y = 60 + rnd(12) - 6;
    const rot = rnd(25) - 12;
    return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" text-anchor="middle" font-family="Verdana,Arial,sans-serif" font-size="40" font-weight="700" fill="#EAF0FF">${ch}</text>`;
  }).join('');
  const noise = Array.from({ length: 6 }, () => `<path d="M${rnd(w)} ${rnd(h)} Q ${rnd(w)} ${rnd(h)} ${rnd(w)} ${rnd(h)}" stroke="#7C5CFF" stroke-opacity=".55" stroke-width="1.4" fill="none"/>`).join('');
  const dots = Array.from({ length: 22 }, () => `<circle cx="${rnd(w)}" cy="${rnd(h)}" r="1.4" fill="#F5B93B" fill-opacity=".6"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${noise}${glyphs}${dots}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

module.exports = { generateCode, buildChallengeOptions, newChallengeId, renderSvgDataUri, distance, ALPHABET };

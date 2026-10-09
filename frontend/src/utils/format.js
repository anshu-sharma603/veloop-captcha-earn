export const fmt = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
export const gemWord = (amount) => (Number(amount) === 1 ? 'Gem' : 'Gems');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

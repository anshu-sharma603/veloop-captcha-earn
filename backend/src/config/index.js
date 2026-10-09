require('dotenv').config();

const int = (v, d) => (v === undefined || v === '' ? d : parseInt(v, 10));
const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('FATAL: JWT_SECRET must be set (>= 32 chars) in production');
  process.exit(1);
}

module.exports = {
  isProd,
  port: int(process.env.PORT, 5000),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veloop_captcha_earn',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },
  captcha: {
    expirySeconds: int(process.env.CAPTCHA_EXPIRY_SECONDS, 120),
    claimWindowSeconds: int(process.env.CLAIM_WINDOW_SECONDS, 600),
    length: int(process.env.CAPTCHA_LENGTH, 6),
    renderMode: process.env.CAPTCHA_RENDER_MODE === 'image' ? 'image' : 'text',
    maxDailyChallenges: int(process.env.MAX_DAILY_CHALLENGES, 500),
  },
  // Fallback only. The source of truth is the CaptchaRewardConfig collection.
  rewardDefaults: {
    correctRewardMilli: int(process.env.DEFAULT_CORRECT_REWARD_MILLI, 1000),
    wrongRewardMilli: int(process.env.DEFAULT_WRONG_REWARD_MILLI, 500),
    currency: 'GEMS',
  },
  rateLimit: {
    windowMs: int(process.env.RL_WINDOW_SECONDS, 60) * 1000,
    global: int(process.env.RL_GLOBAL_MAX, 300),
    current: int(process.env.RL_CURRENT_MAX, 60),
    new: int(process.env.RL_NEW_MAX, 20),
    verify: int(process.env.RL_VERIFY_MAX, 30),
    claim: int(process.env.RL_CLAIM_MAX, 30),
    auth: int(process.env.RL_AUTH_MAX, 20),
    authWindowMs: int(process.env.RL_AUTH_WINDOW_SECONDS, 900) * 1000,
  },
  demo: {
    email: process.env.DEMO_EMAIL || 'demo@veloop.test',
    password: process.env.DEMO_PASSWORD || 'Demo@12345',
    startGems: int(process.env.DEMO_START_GEMS, 100),
  },
};

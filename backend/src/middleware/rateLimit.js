const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('../config');
const { audit } = require('../services/audit.service');

const keyGenerator = (req) => (req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip));

function limiter(name, max, windowMs = config.rateLimit.windowMs) {
  return rateLimit({
    windowMs, limit: max, keyGenerator,
    standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (req, res) => {
      audit('RATE_LIMITED', { userId: req.user?.id, ip: req.ip, meta: { limiter: name, path: req.originalUrl } });
      res.status(429).json({ success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again shortly.' });
    },
  });
}

const rl = config.rateLimit;
module.exports = {
  globalLimiter: limiter('global', rl.global),
  authLimiter: limiter('auth', rl.auth, rl.authWindowMs),
  currentLimiter: limiter('current', rl.current),
  newLimiter: limiter('new', rl.new),
  verifyLimiter: limiter('verify', rl.verify),
  claimLimiter: limiter('claim', rl.claim),
};

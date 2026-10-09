const router = require('express').Router();
const ctrlAuth = require('../controllers/auth.controller');
const ctrlCaptcha = require('../controllers/captcha.controller');
const ctrlWallet = require('../controllers/wallet.controller');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rl = require('../middleware/rateLimit');
const v = require('../validators/captcha.validators');
const AppError = require('../utils/AppError');

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

// Auth
router.post('/auth/register', rl.authLimiter, validate(v.registerSchema), ctrlAuth.register);
router.post('/auth/login', rl.authLimiter, validate(v.loginSchema), ctrlAuth.login);
router.get('/auth/me', requireAuth, ctrlAuth.me);

// CAPTCHA (auth first so limiters are keyed per user)
router.get('/captcha/config', requireAuth, ctrlCaptcha.config);
router.get('/captcha/current', requireAuth, rl.currentLimiter, ctrlCaptcha.current);
router.post('/captcha/new', requireAuth, rl.newLimiter, validate(v.newSchema), ctrlCaptcha.newCaptcha);
router.post('/captcha/verify', requireAuth, rl.verifyLimiter, validate(v.verifySchema), ctrlCaptcha.verify);
router.post('/captcha/claim', requireAuth, rl.claimLimiter, validate(v.claimSchema), ctrlCaptcha.claim);
router.get('/captcha/history', requireAuth, rl.currentLimiter, (req, _res, next) => {
  const p = v.historyQuery.safeParse(req.query); // any ?userId= is ignored: identity = JWT
  if (!p.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid pagination parameters.');
  req.query = p.data; next();
}, ctrlCaptcha.history);

// Wallet
router.get('/wallet/gems', requireAuth, ctrlWallet.gems);
router.get('/wallet/transactions', requireAuth, ctrlWallet.transactions);

module.exports = router;

const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
require('./models/User'); require('./models/Wallet'); require('./models/CaptchaChallenge'); require('./models/CaptchaAttempt');
require('./models/GemTransaction'); require('./models/CaptchaRewardConfig'); require('./models/AuditLog');

connectDB()
  .then(() => app.listen(config.port, () => console.log(`VELoop CAPTCHA Earn API on :${config.port}`)))
  .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });

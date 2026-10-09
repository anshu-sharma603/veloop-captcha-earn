const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet');
const GemTransaction = require('../src/models/GemTransaction');
const CaptchaRewardConfig = require('../src/models/CaptchaRewardConfig');
require('../src/models/CaptchaChallenge'); require('../src/models/CaptchaAttempt'); require('../src/models/AuditLog');

async function upsertUser(name, email, password, startGems) {
  let user = await User.findOne({ email });
  if (!user) user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  const startMilli = startGems * 1000;
  let wallet = await Wallet.findOne({ userId: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ userId: user._id, balanceMilli: startMilli });
    await GemTransaction.create({
      transactionId: `TXN-SEED-${user._id}`, userId: user._id, amountMilli: startMilli, type: 'SEED_BONUS', source: 'SEED',
      referenceId: `SEED-${user._id}`, balanceBeforeMilli: 0, balanceAfterMilli: startMilli,
    });
  }
  return { user, wallet };
}

(async () => {
  await connectDB();
  await CaptchaRewardConfig.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default', correctRewardMilli: config.rewardDefaults.correctRewardMilli, wrongRewardMilli: config.rewardDefaults.wrongRewardMilli, currency: 'GEMS', active: true } },
    { upsert: true }
  );
  const a = await upsertUser('Demo User', config.demo.email, config.demo.password, config.demo.startGems);
  const b = await upsertUser('Demo User Two', 'demo2@veloop.test', config.demo.password, config.demo.startGems);
  console.log(`Seeded:\n  ${a.user.email}  (${a.wallet.balanceMilli / 1000} Gems)\n  ${b.user.email} (${b.wallet.balanceMilli / 1000} Gems)\n  password: ${config.demo.password}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

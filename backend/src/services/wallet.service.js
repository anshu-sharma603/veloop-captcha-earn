const Wallet = require('../models/Wallet');
const AppError = require('../utils/AppError');

async function getOrCreateWallet(userId, session = null) {
  const w = await Wallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, balanceMilli: 0 } },
    { upsert: true, new: true, session }
  );
  return w;
}

async function getGemBalanceMilli(userId) {
  const w = await getOrCreateWallet(userId);
  return w.balanceMilli;
}

/** Atomic $inc; returns { before, after } computed from the post-update document. */
async function creditGems(userId, amountMilli, session = null) {
  if (!Number.isSafeInteger(amountMilli) || amountMilli < 0) throw new AppError(500, 'INVALID_AMOUNT', 'Invalid credit amount');
  await getOrCreateWallet(userId, session);
  const w = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { balanceMilli: amountMilli, lifetimeEarnedMilli: amountMilli } },
    { new: true, session }
  );
  return { before: w.balanceMilli - amountMilli, after: w.balanceMilli };
}

module.exports = { getGemBalanceMilli, creditGems, getOrCreateWallet };

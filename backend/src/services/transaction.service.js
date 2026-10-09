const crypto = require('crypto');
const GemTransaction = require('../models/GemTransaction');

async function createGemTransaction({ userId, amountMilli, referenceId, before, after, type = 'CAPTCHA_REWARD' }, session = null) {
  const [doc] = await GemTransaction.create(
    [{
      transactionId: `TXN-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      userId, amountMilli, type, source: 'CAPTCHA_EARN', referenceId,
      balanceBeforeMilli: before, balanceAfterMilli: after, status: 'COMPLETED',
    }],
    { session }
  );
  return doc;
}
module.exports = { createGemTransaction };

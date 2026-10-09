const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, default: 'GEM' },
    amountMilli: { type: Number, required: true },
    type: { type: String, enum: ['CAPTCHA_REWARD', 'SEED_BONUS'], required: true },
    source: { type: String, default: 'CAPTCHA_EARN' },
    referenceId: { type: String, required: true }, // challengeId
    balanceBeforeMilli: { type: Number, required: true },
    balanceAfterMilli: { type: Number, required: true },
    status: { type: String, enum: ['COMPLETED'], default: 'COMPLETED' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Hard guarantee: a challenge can produce at most ONE ledger entry per type,
// even if every application-level guard had a bug.
schema.index({ type: 1, referenceId: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('GemTransaction', schema);

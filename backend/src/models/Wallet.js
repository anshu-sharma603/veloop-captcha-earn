const mongoose = require('mongoose');

// Balance is an INTEGER number of milli-gems (1 Gem = 1000). See utils/money.js.
const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balanceMilli: { type: Number, required: true, default: 0, min: 0, validate: Number.isSafeInteger },
    lifetimeEarnedMilli: { type: Number, default: 0, validate: Number.isSafeInteger },
    currency: { type: String, default: 'GEMS' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);

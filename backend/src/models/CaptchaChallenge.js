const mongoose = require('mongoose');

/**
 * status:        ACTIVE -> COMPLETED | EXPIRED | DISCARDED   (one-way, never reused)
 * rewardStatus:  NONE -> PENDING -> CLAIMED | DECLINED
 */
const schema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    captchaText: { type: String, required: true, select: false },
    options: { type: [String], required: true, validate: (v) => v.length === 4 },
    correctOption: { type: String, required: true, select: false }, // NEVER sent to clients
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'EXPIRED', 'DISCARDED'], default: 'ACTIVE' },
    expiresAt: { type: Date, required: true },
    selectedOption: { type: String, default: null },
    result: { type: String, enum: ['CORRECT', 'WRONG', null], default: null },
    rewardAmountMilli: { type: Number, default: 0 },
    rewardStatus: { type: String, enum: ['NONE', 'PENDING', 'CLAIMED', 'DECLINED', 'EXPIRED'], default: 'NONE' },
    claimableUntil: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// A user can have at most ONE active challenge. Enforced by the database, so two
// simultaneous GET /current calls cannot create two live challenges.
schema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'one_active_per_user' });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, status: 1, rewardStatus: 1, completedAt: -1 });

module.exports = mongoose.model('CaptchaChallenge', schema);

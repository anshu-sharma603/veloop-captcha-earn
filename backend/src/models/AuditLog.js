const mongoose = require('mongoose');

const EVENTS = [
  'CHALLENGE_CREATED', 'CHALLENGE_VERIFIED', 'REWARD_CREATED', 'REWARD_CLAIMED', 'REWARD_DECLINED',
  'DUPLICATE_ATTEMPT', 'DUPLICATE_CLAIM', 'INVALID_ATTEMPT', 'EXPIRED_CHALLENGE',
  'CROSS_USER_ACCESS', 'SUSPICIOUS_REQUEST', 'LOGIN_FAILED', 'RATE_LIMITED',
];

const schema = new mongoose.Schema(
  {
    event: { type: String, enum: EVENTS, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    challengeId: String,
    ip: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ event: 1, createdAt: -1 });
schema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', schema);
module.exports.EVENTS = EVENTS;

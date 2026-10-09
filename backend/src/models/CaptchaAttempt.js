const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    attemptId: { type: String, required: true, unique: true },
    challengeId: { type: String, required: true, unique: true }, // one accepted attempt per challenge
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    selectedOption: { type: String, required: true },
    result: { type: String, enum: ['CORRECT', 'WRONG'], required: true },
    rewardAmountMilli: { type: Number, required: true },
    status: { type: String, enum: ['VERIFIED'], default: 'VERIFIED' },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CaptchaAttempt', schema);

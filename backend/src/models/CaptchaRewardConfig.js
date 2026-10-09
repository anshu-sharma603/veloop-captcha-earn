const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    correctRewardMilli: { type: Number, required: true, default: 1000, min: 0 },
    wrongRewardMilli: { type: Number, required: true, default: 500, min: 0 },
    currency: { type: String, default: 'GEMS' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CaptchaRewardConfig', schema);

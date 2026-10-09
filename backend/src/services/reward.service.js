const CaptchaRewardConfig = require('../models/CaptchaRewardConfig');
const config = require('../config');

async function getActiveConfig() {
  const doc = await CaptchaRewardConfig.findOne({ active: true }).lean();
  return doc || config.rewardDefaults;
}

/** The ONLY place a reward amount is decided. Client input never reaches here. */
async function calculateReward(isCorrect) {
  const cfg = await getActiveConfig();
  return isCorrect ? cfg.correctRewardMilli : cfg.wrongRewardMilli;
}

module.exports = { getActiveConfig, calculateReward };

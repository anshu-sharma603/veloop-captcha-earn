const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/captcha.service');
const { getGemBalanceMilli } = require('../services/wallet.service');
const { getActiveConfig } = require('../services/reward.service');
const { money, toGems, formatGems } = require('../utils/money');
const config = require('../config');

exports.current = asyncHandler(async (req, res) => {
  const data = await svc.getCurrent(req.user.id, req.ip);
  res.json({ success: true, ...data });
});

exports.newCaptcha = asyncHandler(async (req, res) => {
  const { challenge } = await svc.newChallenge(req.user.id, req.ip);
  res.status(201).json({ success: true, state: 'CHALLENGE', challenge });
});

exports.verify = asyncHandler(async (req, res) => {
  // req.body only contains challengeId + selectedOption (zod strips everything else).
  const ch = await svc.verifyChallenge({
    userId: req.user.id, challengeId: req.body.challengeId, selectedOption: req.body.selectedOption,
    ip: req.ip, userAgent: req.get('user-agent'),
  });
  const balance = await getGemBalanceMilli(req.user.id);
  res.json({ success: true, ...svc.toResult(ch), balance: money(balance) });
});

exports.claim = asyncHandler(async (req, res) => {
  const out = await svc.claimReward({ userId: req.user.id, challengeId: req.body.challengeId, ip: req.ip });
  res.json({
    success: true,
    challengeId: req.body.challengeId,
    rewardStatus: 'CLAIMED',
    reward: money(out.claimed.rewardAmountMilli),
    transactionId: out.tx.transactionId,
    balance: { before: money(out.before), after: money(out.after) },
  });
});

exports.history = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await svc.getHistory(req.user.id, page, limit);
  res.json({ success: true, ...data });
});

exports.config = asyncHandler(async (_req, res) => {
  const cfg = await getActiveConfig();
  res.json({
    success: true,
    config: {
      currency: cfg.currency || 'GEMS',
      correctReward: money(cfg.correctRewardMilli),
      wrongReward: money(cfg.wrongRewardMilli),
      optionsPerChallenge: 4,
      challengeExpirySeconds: config.captcha.expirySeconds,
      claimWindowSeconds: config.captcha.claimWindowSeconds,
      verifyAnimationMs: 500,
    },
  });
});

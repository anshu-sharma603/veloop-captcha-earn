const asyncHandler = require('../utils/asyncHandler');
const GemTransaction = require('../models/GemTransaction');
const { getGemBalanceMilli } = require('../services/wallet.service');
const { money } = require('../utils/money');

exports.gems = asyncHandler(async (req, res) => {
  res.json({ success: true, balance: money(await getGemBalanceMilli(req.user.id)) });
});

exports.transactions = asyncHandler(async (req, res) => {
  const items = await GemTransaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({
    success: true,
    items: items.map((t) => ({
      transactionId: t.transactionId, type: t.type, source: t.source, referenceId: t.referenceId, status: t.status,
      amount: money(t.amountMilli), balanceBefore: money(t.balanceBeforeMilli), balanceAfter: money(t.balanceAfterMilli), createdAt: t.createdAt,
    })),
  });
});

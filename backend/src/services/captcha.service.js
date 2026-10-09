const crypto = require('crypto');
const CaptchaChallenge = require('../models/CaptchaChallenge');
const CaptchaAttempt = require('../models/CaptchaAttempt');
const Wallet = require('../models/Wallet');
const GemTransaction = require('../models/GemTransaction');
const AppError = require('../utils/AppError');
const config = require('../config');
const { runAtomic } = require('../config/db');
const { buildChallengeOptions, newChallengeId, renderSvgDataUri } = require('../utils/generator');
const { money } = require('../utils/money');
const { calculateReward } = require('./reward.service');
const { creditGems } = require('./wallet.service');
const { createGemTransaction } = require('./transaction.service');
const { audit } = require('./audit.service');

const DUP = (e) => e && (e.code === 11000 || e.code === 11001);

/* ---------- Public shapes (correctOption is NEVER included) ---------- */

function toPublicChallenge(doc) {
  const out = {
    challengeId: doc.challengeId,
    options: doc.options,
    expiresAt: doc.expiresAt,
    expiresInSeconds: Math.max(0, Math.round((doc.expiresAt - Date.now()) / 1000)),
  };
  if (config.captcha.renderMode === 'image') out.imageSvg = renderSvgDataUri(doc.captchaText);
  else out.question = doc.captchaText;
  return out;
}

const toResult = (doc) => ({
  challengeId: doc.challengeId,
  result: doc.result,
  reward: money(doc.rewardAmountMilli),
  rewardStatus: doc.rewardStatus,
  claimable: doc.rewardStatus === 'PENDING' && doc.claimableUntil > new Date(),
  claimableUntil: doc.claimableUntil,
});

/* ---------- Challenge lifecycle ---------- */

async function createChallenge(userId, ip) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const count = await CaptchaChallenge.countDocuments({ userId, createdAt: { $gte: since } });
  if (count >= config.captcha.maxDailyChallenges) {
    throw new AppError(429, 'DAILY_LIMIT_REACHED', 'Daily CAPTCHA limit reached. Please come back tomorrow.');
  }
  const { captchaText, correctOption, options } = buildChallengeOptions(config.captcha.length);
  const doc = await CaptchaChallenge.create({
    challengeId: newChallengeId(),
    userId, captchaText, correctOption, options,
    expiresAt: new Date(Date.now() + config.captcha.expirySeconds * 1000),
  });
  audit('CHALLENGE_CREATED', { userId, challengeId: doc.challengeId, ip });
  return doc;
}

async function sweepStale(userId, now) {
  await CaptchaChallenge.updateMany({ userId, status: 'ACTIVE', expiresAt: { $lte: now } }, { $set: { status: 'EXPIRED' } });
  await CaptchaChallenge.updateMany(
    { userId, status: 'COMPLETED', rewardStatus: 'PENDING', claimableUntil: { $lte: now } },
    { $set: { rewardStatus: 'EXPIRED' } }
  );
}

async function ensureActive(userId, ip) {
  try {
    return await createChallenge(userId, ip);
  } catch (e) {
    if (DUP(e)) return CaptchaChallenge.findOne({ userId, status: 'ACTIVE' }).select('+captchaText'); // lost the race
    throw e;
  }
}

/** GET /current: resume an unclaimed reward, else the live challenge, else a fresh one. */
async function getCurrent(userId, ip) {
  const now = new Date();
  await sweepStale(userId, now);
  const pending = await CaptchaChallenge.findOne({
    userId, status: 'COMPLETED', rewardStatus: 'PENDING', claimableUntil: { $gt: now },
  }).sort({ completedAt: -1 });
  if (pending) return { state: 'RESULT', result: toResult(pending) };

  let active = await CaptchaChallenge.findOne({ userId, status: 'ACTIVE' }).select('+captchaText');
  if (!active) active = await ensureActive(userId, ip);
  return { state: 'CHALLENGE', challenge: toPublicChallenge(active) };
}

/** POST /new: "No Thanks" / "New Code". Old challenge is closed for good, pending reward forfeited. */
async function newChallenge(userId, ip) {
  const discarded = await CaptchaChallenge.updateMany({ userId, status: 'ACTIVE' }, { $set: { status: 'DISCARDED' } });
  const declined = await CaptchaChallenge.find({ userId, status: 'COMPLETED', rewardStatus: 'PENDING' }).select('challengeId');
  if (declined.length) {
    await CaptchaChallenge.updateMany({ userId, status: 'COMPLETED', rewardStatus: 'PENDING' }, { $set: { rewardStatus: 'DECLINED' } });
    declined.forEach((d) => audit('REWARD_DECLINED', { userId, challengeId: d.challengeId, ip }));
  }
  const active = await ensureActive(userId, ip);
  return { challenge: toPublicChallenge(active), discarded: discarded.modifiedCount };
}

/* ---------- Verification ---------- */

function rejectForState(ch, { userId, ip, now }) {
  if (ch.status === 'COMPLETED') {
    audit('DUPLICATE_ATTEMPT', { userId, challengeId: ch.challengeId, ip });
    throw new AppError(409, 'CHALLENGE_ALREADY_COMPLETED', 'This CAPTCHA has already been completed.');
  }
  if (ch.status === 'DISCARDED') {
    audit('INVALID_ATTEMPT', { userId, challengeId: ch.challengeId, ip, meta: { reason: 'discarded' } });
    throw new AppError(409, 'CHALLENGE_DISCARDED', 'This CAPTCHA is no longer valid. Please continue with a new CAPTCHA.');
  }
  if (ch.status === 'EXPIRED' || ch.expiresAt <= now) {
    audit('EXPIRED_CHALLENGE', { userId, challengeId: ch.challengeId, ip });
    throw new AppError(410, 'CHALLENGE_EXPIRED', 'Challenge expired. Please continue with a new CAPTCHA.');
  }
}

async function verifyChallenge({ userId, challengeId, selectedOption, ip, userAgent }) {
  const now = new Date();
  // Identity comes from the JWT; the query is scoped to it => other users' challenges look non-existent.
  const ch = await CaptchaChallenge.findOne({ challengeId, userId }).select('+correctOption');
  if (!ch) {
    const existsForOther = await CaptchaChallenge.exists({ challengeId });
    audit(existsForOther ? 'CROSS_USER_ACCESS' : 'INVALID_ATTEMPT', { userId, challengeId, ip });
    throw new AppError(404, 'CHALLENGE_NOT_FOUND', 'Challenge not found.');
  }
  rejectForState(ch, { userId, ip, now });

  if (!ch.options.includes(selectedOption)) {
    audit('INVALID_ATTEMPT', { userId, challengeId, ip, meta: { reason: 'option_not_in_challenge' } });
    throw new AppError(400, 'INVALID_OPTION', 'Selected option is not part of this challenge.');
  }

  const isCorrect = selectedOption === ch.correctOption; // server-side only
  const rewardMilli = await calculateReward(isCorrect);   // server-side only
  const claimableUntil = new Date(now.getTime() + config.captcha.claimWindowSeconds * 1000);
  const result = isCorrect ? 'CORRECT' : 'WRONG';

  const updated = await runAtomic(async (session) => {
    // Compare-and-set: only ONE concurrent request can flip ACTIVE -> COMPLETED.
    const u = await CaptchaChallenge.findOneAndUpdate(
      { _id: ch._id, status: 'ACTIVE', expiresAt: { $gt: now } },
      { $set: { status: 'COMPLETED', selectedOption, result, rewardAmountMilli: rewardMilli, rewardStatus: 'PENDING', claimableUntil, completedAt: now } },
      { new: true, session }
    );
    if (!u) return null;
    try {
      await CaptchaAttempt.create(
        [{ attemptId: `ATT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`, challengeId, userId, selectedOption, result, rewardAmountMilli: rewardMilli, ip, userAgent }],
        { session }
      );
    } catch (e) {
      if (!session) { // no transaction available: undo the state flip
        await CaptchaChallenge.updateOne({ _id: ch._id, status: 'COMPLETED' }, { $set: { status: 'ACTIVE', rewardStatus: 'NONE', result: null, selectedOption: null, rewardAmountMilli: 0, completedAt: null, claimableUntil: null } });
      }
      throw e;
    }
    return u;
  });

  if (!updated) { // lost the race, expired in-flight, or discarded in-flight
    const fresh = await CaptchaChallenge.findById(ch._id);
    rejectForState(fresh, { userId, ip, now: new Date() });
    throw new AppError(409, 'CHALLENGE_ALREADY_COMPLETED', 'This CAPTCHA has already been completed.');
  }
  audit('CHALLENGE_VERIFIED', { userId, challengeId, ip, meta: { result } });
  audit('REWARD_CREATED', { userId, challengeId, ip, meta: { amountMilli: rewardMilli, status: 'PENDING' } });
  return updated;
}

/* ---------- Claim (the only place Gems are credited) ---------- */

async function claimReward({ userId, challengeId, ip }) {
  const now = new Date();
  const ch = await CaptchaChallenge.findOne({ challengeId, userId });
  if (!ch) {
    const existsForOther = await CaptchaChallenge.exists({ challengeId });
    audit(existsForOther ? 'CROSS_USER_ACCESS' : 'INVALID_ATTEMPT', { userId, challengeId, ip, meta: { op: 'claim' } });
    throw new AppError(404, 'CHALLENGE_NOT_FOUND', 'Challenge not found.');
  }

  const out = await runAtomic(async (session) => {
    const claimed = await CaptchaChallenge.findOneAndUpdate(
      { _id: ch._id, status: 'COMPLETED', rewardStatus: 'PENDING', claimableUntil: { $gt: now } },
      { $set: { rewardStatus: 'CLAIMED', claimedAt: now } },
      { new: true, session }
    );
    if (!claimed) return null;
    let credited = null;
    try {
      credited = await creditGems(userId, claimed.rewardAmountMilli, session);
      const tx = await createGemTransaction(
        { userId, amountMilli: claimed.rewardAmountMilli, referenceId: challengeId, before: credited.before, after: credited.after }, session
      );
      return { claimed, tx, ...credited };
    } catch (e) {
      if (!session) { // standalone MongoDB: compensate manually
        if (credited) await Wallet.updateOne({ userId }, { $inc: { balanceMilli: -claimed.rewardAmountMilli, lifetimeEarnedMilli: -claimed.rewardAmountMilli } });
        await CaptchaChallenge.updateOne({ _id: ch._id }, { $set: { rewardStatus: 'PENDING', claimedAt: null } });
      }
      throw e;
    }
  }).catch((e) => {
    if (DUP(e)) throw new AppError(409, 'REWARD_ALREADY_CLAIMED', 'This reward has already been claimed.');
    throw e;
  });

  if (!out) {
    const fresh = await CaptchaChallenge.findById(ch._id);
    if (fresh.rewardStatus === 'CLAIMED') {
      audit('DUPLICATE_CLAIM', { userId, challengeId, ip });
      throw new AppError(409, 'REWARD_ALREADY_CLAIMED', 'This reward has already been claimed.');
    }
    if (fresh.rewardStatus === 'DECLINED') throw new AppError(409, 'REWARD_DECLINED', 'This reward was declined and can no longer be claimed.');
    if (fresh.status !== 'COMPLETED') throw new AppError(409, 'CHALLENGE_NOT_VERIFIED', 'Verify the CAPTCHA before claiming.');
    audit('INVALID_ATTEMPT', { userId, challengeId, ip, meta: { op: 'claim', reason: 'claim_window_closed' } });
    throw new AppError(410, 'CLAIM_EXPIRED', 'The claim window for this reward has closed.');
  }
  audit('REWARD_CLAIMED', { userId, challengeId, ip, meta: { transactionId: out.tx.transactionId, amountMilli: out.claimed.rewardAmountMilli } });
  return out;
}

/* ---------- History ---------- */

async function getHistory(userId, page, limit) {
  const filter = { userId, status: 'COMPLETED' };
  const [items, total] = await Promise.all([
    CaptchaChallenge.find(filter) // correctOption/captchaText are select:false => never leave the DB layer
      .select('challengeId result rewardAmountMilli rewardStatus completedAt claimedAt')
      .sort({ completedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CaptchaChallenge.countDocuments(filter),
  ]);
  return {
    total, page, limit,
    items: items.map((d) => ({
      challengeId: d.challengeId, date: d.completedAt, result: d.result,
      reward: money(d.rewardAmountMilli), rewardStatus: d.rewardStatus, claimedAt: d.claimedAt,
    })),
  };
}

module.exports = { getCurrent, newChallenge, verifyChallenge, claimReward, getHistory, toPublicChallenge, toResult, createChallenge };

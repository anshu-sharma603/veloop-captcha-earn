const { audit } = require('../services/audit.service');
const AppError = require('../utils/AppError');

// Fields a client must never be able to influence. They are ignored AND flagged.
const FORBIDDEN = ['reward', 'rewardAmount', 'amount', 'isCorrect', 'result', 'userId', 'correctOption', 'balance', 'gems'];

const validate = (schema) => (req, _res, next) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const sneaky = FORBIDDEN.filter((k) => k in body);
  if (sneaky.length) {
    audit('SUSPICIOUS_REQUEST', { userId: req.user?.id, challengeId: body.challengeId, ip: req.ip, meta: { ignoredFields: sneaky, path: req.originalUrl } });
  }
  const parsed = schema.safeParse(body); // zod strips unknown keys => reward/isCorrect never reach the service
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
  }
  req.body = parsed.data;
  next();
};
module.exports = validate;

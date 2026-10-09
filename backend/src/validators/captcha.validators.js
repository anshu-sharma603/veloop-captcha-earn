const { z } = require('zod');

const challengeId = z.string({ required_error: 'challengeId is required' }).regex(/^CAP-[A-F0-9]{10}$/, 'invalid challengeId format');

const verifySchema = z.object({
  challengeId,
  selectedOption: z.string({ required_error: 'selectedOption is required' }).trim().min(1).max(16),
});
const claimSchema = z.object({ challengeId });
const newSchema = z.object({}).passthrough().transform(() => ({}));
const historyQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) });

module.exports = { verifySchema, claimSchema, newSchema, historyQuery, registerSchema, loginSchema };

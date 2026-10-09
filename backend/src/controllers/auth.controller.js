const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { getOrCreateWallet } = require('../services/wallet.service');
const { signToken } = require('../middleware/auth');
const { audit } = require('../services/audit.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { money } = require('../utils/money');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // equalises timing for unknown emails

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  await getOrCreateWallet(user._id);
  res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok || !user.isActive) {
    audit('LOGIN_FAILED', { ip: req.ip, meta: { email } });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }
  const wallet = await getOrCreateWallet(user._id);
  res.json({ success: true, token: signToken(user), user: publicUser(user), balance: money(wallet.balanceMilli) });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user: publicUser(user) });
});

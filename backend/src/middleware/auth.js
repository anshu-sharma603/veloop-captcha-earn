const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) => jwt.sign({ sub: String(user._id) }, config.jwt.secret, { expiresIn: config.jwt.expiresIn, algorithm: 'HS256' });

/** Identity is derived ONLY from the verified token. userId in body/query/params is never read. */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Session expired or invalid. Please log in again.');
  }
  const user = await User.findById(payload.sub).select('email role isActive');
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Account not available.');
  req.user = { id: String(user._id), email: user.email, role: user.role };
  next();
});

module.exports = { requireAuth, signToken };

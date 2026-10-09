const config = require('../config');

const notFound = (req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found.` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err.isAppError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, code: 'INVALID_JSON', message: 'Request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' });
  if (err.code === 11000) return res.status(409).json({ success: false, code: 'DUPLICATE', message: 'Duplicate request.' });
  console.error(err);
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', ...(config.isProd ? {} : { debug: err.message }) });
};
module.exports = { notFound, errorHandler };

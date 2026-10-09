const AuditLog = require('../models/AuditLog');

/** Fire-and-forget: auditing must never break or slow the request path. */
function audit(event, { userId = null, challengeId, ip, meta } = {}) {
  AuditLog.create({ event, userId, challengeId, ip, meta }).catch((e) => console.error('audit failed', e.message));
}
module.exports = { audit };

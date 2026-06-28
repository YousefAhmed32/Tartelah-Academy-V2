const AuditLog = require('../models/AuditLog')

async function logAction({ actorId, actorRole, action, entity, entityId, changes, meta, ip }) {
  try {
    await AuditLog.create({ actorId, actorRole, action, entity, entityId, changes, meta, ip })
  } catch (err) {
    console.error('[Audit] Failed to log action:', err.message)
  }
}

module.exports = { logAction }

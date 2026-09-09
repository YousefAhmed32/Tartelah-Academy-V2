const Notification = require('../models/Notification')
const socketService = require('./socket.service')
const { isSafeInternalActionUrl, DEFAULT_ENTITY_TYPE_BY_NOTIFICATION_TYPE } = require('../config/notificationDestinations')

// Producers are trusted server code (never client input), so this is
// defense-in-depth against drift, not an attacker threat model: a
// renamed/typo'd route should never silently ship a dead or unsafe
// notification link. An invalid actionUrl is dropped (logged), not fatal —
// the notification itself is still worth delivering without a destination.
function sanitizeActionUrl(actionUrl) {
  if (!actionUrl) return undefined
  if (isSafeInternalActionUrl(actionUrl)) return actionUrl
  console.warn(`[notification.service] Dropped unsafe/unknown actionUrl: ${actionUrl}`)
  return undefined
}

function withDefaults(n) {
  return {
    ...n,
    priority: n.priority || 'medium',
    actionUrl: sanitizeActionUrl(n.actionUrl),
    entityType: n.entityType || DEFAULT_ENTITY_TYPE_BY_NOTIFICATION_TYPE[n.type] || undefined,
  }
}

// Optional idempotency guard: a producer that can plausibly run more than
// once for the same real-world event (a cron sweep re-evaluating the same
// record, a webhook retry) passes `metadata.dedupeKey` — a string that
// uniquely identifies *this occurrence* (e.g. `attendance:${sessionId}:no_show`).
// If a notification with the same userId + type + dedupeKey already exists,
// the call is a silent no-op instead of a duplicate row. Producers that
// don't pass a dedupeKey are unaffected (opt-in, fully backward compatible).
async function findExistingDedupeKeys(entries) {
  const keyed = entries
    .map((n, i) => ({ i, userId: n.userId, type: n.type, dedupeKey: n.metadata?.dedupeKey }))
    .filter((e) => e.dedupeKey)
  if (!keyed.length) return new Set()

  const existing = await Notification.find({
    $or: keyed.map((e) => ({ userId: e.userId, type: e.type, 'metadata.dedupeKey': e.dedupeKey })),
  }).select('userId type metadata.dedupeKey').lean()

  const existingSet = new Set(existing.map((e) => `${e.userId}:${e.type}:${e.metadata?.dedupeKey}`))
  const dupeIndices = new Set()
  for (const e of keyed) {
    if (existingSet.has(`${e.userId}:${e.type}:${e.dedupeKey}`)) dupeIndices.add(e.i)
  }
  return dupeIndices
}

async function createNotification(input) {
  const [dupeIndex] = await findExistingDedupeKeys([input])
  if (dupeIndex === 0) return null

  const notif = await Notification.create(withDefaults(input))
  socketService.emitToUser(notif.userId, 'notification:new', notif)
  return notif
}

async function createNotifications(notifications) {
  if (!notifications || !notifications.length) return []

  const dupeIndices = await findExistingDedupeKeys(notifications)
  const docs = notifications
    .map((n, i) => ({ i, doc: withDefaults(n) }))
    .filter(({ i }) => !dupeIndices.has(i))
  if (!docs.length) return []

  const created = await Notification.insertMany(docs.map((d) => d.doc))
  for (const n of created) {
    socketService.emitToUser(n.userId, 'notification:new', n)
  }
  return created
}

module.exports = { createNotification, createNotifications }

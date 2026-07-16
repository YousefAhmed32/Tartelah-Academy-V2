const Session = require('../models/Session')

// One-time, idempotent backfill for the `subscriptionConsumed` bookkeeping
// field introduced alongside the session-based consumption rule (present/
// late consumes a purchased session, absent/excused/cancelled never do —
// see session.controller.js syncSubscriptionConsumption). Every historical
// `completed` session already decremented Subscription.sessionsRemaining
// unconditionally under the old logic, so this only marks that consumption
// as already applied — it never touches Subscription.sessionsRemaining
// itself. Safe to run on every boot: the filter excludes anything already
// backfilled, so re-running is a no-op.
async function backfillSubscriptionConsumed() {
  const result = await Session.updateMany(
    { status: 'completed', subscriptionConsumed: { $ne: true } },
    [{ $set: { subscriptionConsumed: true, subscriptionConsumedAt: { $ifNull: ['$completedAt', '$updatedAt'] } } }]
  )
  if (result.modifiedCount > 0) {
    console.log(`[migration] backfilled subscriptionConsumed on ${result.modifiedCount} completed session(s)`)
  }
}

module.exports = { backfillSubscriptionConsumed }

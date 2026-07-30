const Session = require('../models/Session')
const walletService = require('./wallet.service')

// Auto-grants a compensation lesson when the ACADEMY (teacher or system)
// caused a session not to happen — teacher cancellation or teacher no-show.
// Idempotent: keyed on the session, so a retried call (e.g. the sweep job
// re-scanning, or a duplicate cancel request) never double-grants.
async function grantCompensation(session, { reason, grantedByRole = 'system', grantedBy } = {}) {
  if (session.compensationGrantedTransactionId) {
    return { alreadyGranted: true }
  }

  const { transaction, alreadyApplied } = await walletService.applyTransaction({
    studentId: session.studentId,
    type: 'compensation',
    amount: 1,
    idempotencyKey: `session:${session._id}:compensation`,
    reason: reason || 'حصة تعويضية — إلغاء أو غياب من طرف الأكاديمية',
    relatedSessionId: session._id,
    relatedSubscriptionId: session.subscriptionId,
    performedByRole: grantedByRole,
    performedBy: grantedBy,
  })

  session.compensationRequired = true
  session.compensationGrantedTransactionId = transaction._id
  session.compensationReason = reason

  return { alreadyGranted: alreadyApplied, transaction }
}

module.exports = { grantCompensation }

const LessonWallet = require('../models/LessonWallet')
const LessonTransaction = require('../models/LessonTransaction')
const Subscription = require('../models/Subscription')

// Single chokepoint for every wallet balance change in the platform.
//
// MongoDB here runs as a single standalone mongod (no replica set — see
// ARCHITECTURE_PLAN.md), so multi-document ACID transactions
// (mongoose.startSession()/withTransaction()) are not available. Instead
// this uses the same pattern already established elsewhere in this codebase
// (Subscription's atomic `findOneAndUpdate({$inc...})`), made safe against
// duplicate/retried calls with a deterministic `idempotencyKey` backed by a
// unique index on LessonTransaction — a duplicate call is a guaranteed
// no-op, not a double deduction.
//
// Deliberately does NOT clamp `remaining` at zero. The old Subscription
// model silently floored sessionsRemaining at 0, which hid real information
// (a student legitimately over-consumed relative to what they paid for).
// Letting the balance go negative surfaces that as a visible, auditable
// signal instead of quietly absorbing it — "nothing should change silently."

function fieldsToIncrement(type, amount) {
  switch (type) {
    case 'purchase':
    case 'renewal':
    // A new subscription's documented opening balance — credited the same
    // way a purchase is (see LessonTransaction's enum comment for why this
    // is a distinct type rather than reusing 'purchase').
    case 'opening_balance':
      return { remaining: amount, totalPurchased: amount }
    case 'consumption':
    case 'reversal':
      // amount is negative for a consumption, positive for a reversal;
      // totalUsed always moves the opposite direction of amount.
      return { remaining: amount, totalUsed: -amount }
    case 'refund':
      return { remaining: amount, totalPurchased: amount }
    case 'bonus':
      return { remaining: amount, bonusLessons: amount }
    case 'compensation':
      return { remaining: amount, compensationLessons: amount }
    case 'transfer_out':
      return { remaining: amount, transferredOut: -amount }
    case 'transfer_in':
      return { remaining: amount, transferredIn: amount }
    case 'manual_adjustment':
    case 'admin_edit':
      if (amount < 0) {
        // Administrative deduction: counts towards deductedLessons AND totalUsed (consumed)
        const deducted = -amount
        return { remaining: amount, deductedLessons: deducted, totalUsed: deducted }
      }
      return { remaining: amount }
    case 'migration_import':
    default:
      return { remaining: amount }
  }
}

async function getOrCreateWallet(studentId) {
  return LessonWallet.findOneAndUpdate(
    { studentId },
    { $setOnInsert: { studentId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

/**
 * Applies one signed lesson-balance movement, atomically and idempotently.
 * Returns { transaction, wallet, alreadyApplied }. When `idempotencyKey` has
 * already been used, no new transaction/increment happens and the existing
 * transaction is returned with alreadyApplied: true.
 */
async function applyTransaction({
  studentId, type, amount, idempotencyKey, reason,
  relatedSessionId, relatedSubscriptionId, relatedStudentId,
  performedByRole = 'system', performedBy, correctsTransactionId, metadata,
}) {
  if (!studentId) throw new Error('applyTransaction requires studentId')
  if (!type) throw new Error('applyTransaction requires type')
  if (typeof amount !== 'number' || Number.isNaN(amount)) throw new Error('applyTransaction requires a numeric amount')

  const wallet = await getOrCreateWallet(studentId)
  const balanceAfter = (wallet.remaining || 0) + amount

  let transaction
  try {
    transaction = await LessonTransaction.create({
      walletId: wallet._id, studentId, type, amount, balanceAfter,
      idempotencyKey, reason, relatedSessionId, relatedSubscriptionId, relatedStudentId,
      performedByRole, performedBy, correctsTransactionId, metadata,
    })
  } catch (err) {
    if (err.code === 11000) {
      const existing = await LessonTransaction.findOne({ idempotencyKey })
      return { transaction: existing, wallet, alreadyApplied: true }
    }
    throw err
  }

  const inc = fieldsToIncrement(type, amount)
  const updatedWallet = await LessonWallet.findOneAndUpdate(
    { _id: wallet._id },
    { $inc: inc, $set: { lastTransactionAt: new Date() } },
    { new: true }
  )

  // Backward-compat mirror: Subscription.sessionsRemaining/totalSessions are
  // kept in sync so student dashboard, admin views, and legacy projections
  // immediately reflect every wallet balance adjustment without drift.
  try {
    const targetSubId = relatedSubscriptionId || (
      await Subscription.findOne({ studentId, status: { $in: ['active', 'paused'] } })
        .sort({ createdAt: -1 })
        .select('_id')
        .then(s => s?._id)
    )
    if (targetSubId) {
      await Subscription.findByIdAndUpdate(targetSubId, {
        $set: {
          sessionsRemaining: Math.max(0, updatedWallet.remaining),
          ...(updatedWallet.totalPurchased ? { totalSessions: updatedWallet.totalPurchased } : {}),
        },
      })
    }
  } catch (_) {
    // Best-effort mirror — never blocks the authoritative wallet transaction
  }

  return { transaction, wallet: updatedWallet, alreadyApplied: false }
}

async function getWallet(studentId) {
  return LessonWallet.findOne({ studentId })
}

async function getTransactions(studentId, { page = 1, limit = 20 } = {}) {
  const filter = { studentId }
  const skip = (page - 1) * limit
  const [transactions, total] = await Promise.all([
    LessonTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    LessonTransaction.countDocuments(filter),
  ])
  return { transactions, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

async function freezeWallet(studentId, { reason, resumeAt, frozenBy } = {}) {
  const wallet = await getOrCreateWallet(studentId)
  if (wallet.status === 'frozen') return wallet
  const updated = await LessonWallet.findOneAndUpdate(
    { _id: wallet._id },
    { $set: { status: 'frozen', freezeReason: reason, frozenAt: new Date(), frozenBy, resumeAt: resumeAt ? new Date(resumeAt) : undefined, frozenLessons: wallet.remaining } },
    { new: true }
  )
  await LessonTransaction.create({
    walletId: wallet._id, studentId, type: 'freeze', amount: 0, balanceAfter: wallet.remaining,
    reason, performedByRole: 'admin', performedBy: frozenBy,
  })
  return updated
}

async function resumeWallet(studentId, { resumedBy } = {}) {
  const wallet = await getOrCreateWallet(studentId)
  if (wallet.status !== 'frozen') return wallet
  const updated = await LessonWallet.findOneAndUpdate(
    { _id: wallet._id },
    { $set: { status: 'active', frozenLessons: 0 }, $unset: { freezeReason: '', frozenAt: '', frozenBy: '', resumeAt: '' } },
    { new: true }
  )
  await LessonTransaction.create({
    walletId: wallet._id, studentId, type: 'unfreeze', amount: 0, balanceAfter: wallet.remaining,
    performedByRole: 'admin', performedBy: resumedBy,
  })
  return updated
}

module.exports = {
  getOrCreateWallet, applyTransaction, getWallet, getTransactions, freezeWallet, resumeWallet,
}

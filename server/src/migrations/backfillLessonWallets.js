const Subscription = require('../models/Subscription')
const LessonWallet = require('../models/LessonWallet')
const LessonTransaction = require('../models/LessonTransaction')

// One-time, idempotent backfill that creates a LessonWallet for every
// student who has at least one Subscription but no wallet yet — introduced
// alongside the Lesson Wallet redesign (LessonWallet is now the canonical
// source of lesson entitlement; Subscription.sessionsRemaining/totalSessions
// become a deprecated mirror, see models/Subscription.js).
//
// For each such student, sums totalSessions/sessionsRemaining across ALL of
// their historical subscriptions and reconstructs the wallet from that sum,
// plus a single `migration_import` LessonTransaction recording exactly what
// was imported — no history is discarded, and the import itself is
// auditable like every other wallet movement. Safe to run on every boot:
// already-migrated students (a wallet already exists) are skipped.
async function backfillLessonWallets() {
  const studentIds = await Subscription.distinct('studentId')
  if (!studentIds.length) return

  const existingWalletStudentIds = new Set(
    (await LessonWallet.find({ studentId: { $in: studentIds } }).select('studentId')).map(w => w.studentId.toString())
  )
  const pending = studentIds.filter(id => !existingWalletStudentIds.has(id.toString()))
  if (!pending.length) return

  let migrated = 0
  for (const studentId of pending) {
    const rows = await Subscription.aggregate([
      { $match: { studentId } },
      { $group: { _id: null, totalPurchased: { $sum: '$totalSessions' }, remaining: { $sum: '$sessionsRemaining' } } },
    ])
    const totalPurchased = Math.max(0, rows[0]?.totalPurchased || 0)
    const remaining = Math.max(0, rows[0]?.remaining || 0)
    const totalUsed = Math.max(0, totalPurchased - remaining)

    const wallet = await LessonWallet.create({
      studentId, totalPurchased, totalUsed, remaining, lastTransactionAt: new Date(),
    })
    await LessonTransaction.create({
      walletId: wallet._id, studentId, type: 'migration_import', amount: remaining, balanceAfter: remaining,
      reason: 'استيراد الرصيد من نظام الاشتراكات القديم', performedByRole: 'system',
      idempotencyKey: `migration:wallet-import:${studentId}`,
      metadata: { totalPurchased, totalUsed },
    })
    migrated++
  }

  if (migrated > 0) {
    console.log(`[migration] created ${migrated} LessonWallet(s) from historical Subscription data`)
  }
}

module.exports = { backfillLessonWallets }

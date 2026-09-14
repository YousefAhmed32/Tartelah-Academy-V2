// Shared subscription-creation logic — used by both the standalone
// POST /subscriptions endpoint (subscription.controller.js) and the teacher
// onboarding wizard (onboarding.service.js), so the "package → opening
// balance → wallet credit" flow only exists in one place.
const Subscription = require('../models/Subscription')
const Package = require('../models/Package')
const walletService = require('./wallet.service')
const { computeOpeningBalance, OpeningBalanceError } = require('../config/lessonPolicy')

class SubscriptionCreationError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

/**
 * Creates a Subscription (billing-cycle record) and credits the student's
 * LessonWallet with its opening balance as one documented, idempotent
 * transaction. Either `lessonsUsed` or `lessonsRemaining` may be provided
 * (not both) to record how many of the package's total lessons were already
 * consumed before entering the system — omitting both defaults to "brand
 * new package" (used: 0, remaining: total), identical to the platform's
 * prior behavior.
 *
 * Throws SubscriptionCreationError / OpeningBalanceError (both carry a
 * user-facing Arabic .message and an HTTP .status) before any write occurs
 * if validation fails. If the wallet credit fails after the Subscription
 * document was already created, the Subscription is deleted (compensating
 * rollback) so a subscription is never left on record with no matching
 * wallet credit.
 */
async function createSubscriptionWithOpeningBalance({
  studentId, packageId, teacherId, startDate, endDate, remainingDays, notes,
  lessonsUsed, lessonsRemaining, actorId, actorRole = 'admin',
}) {
  if (!studentId) throw new SubscriptionCreationError('معرف الطالب مطلوب')
  if (!packageId) throw new SubscriptionCreationError('يجب اختيار باقة')

  const pkg = await Package.findById(packageId)
  if (!pkg) throw new SubscriptionCreationError('الباقة غير موجودة', 404)
  if (!pkg.isActive) throw new SubscriptionCreationError('لا يمكن استخدام باقة غير مُفعّلة')

  // Validates & derives {used, remaining} — throws OpeningBalanceError (400)
  // on bad input, before any document is written.
  const { used, remaining } = computeOpeningBalance({
    packageTotal: pkg.sessionsPerMonth, lessonsUsed, lessonsRemaining,
  })

  const start = startDate ? new Date(startDate) : new Date()
  if (Number.isNaN(start.getTime())) throw new SubscriptionCreationError('تاريخ بداية الاشتراك غير صالح')
  const days = Number(remainingDays) || pkg.durationDays || 30
  const end = endDate && !Number.isNaN(new Date(endDate).getTime())
    ? new Date(endDate)
    : new Date(start.getTime() + days * 24 * 60 * 60 * 1000)

  const sub = await Subscription.create({
    studentId, packageId, packageNameAr: pkg.nameAr, teacherId,
    startDate: start, endDate: end, billingDate: start, renewalDate: end,
    sessionsRemaining: remaining, totalSessions: pkg.sessionsPerMonth,
    amountPaid: pkg.price, notes, createdBy: actorId,
  })

  try {
    const reasonSuffix = used > 0 ? ` (منها ${used} حصة مستخدمة مسبقًا)` : ''
    const { transaction } = await walletService.applyTransaction({
      studentId, type: 'opening_balance', amount: remaining,
      idempotencyKey: `subscription:${sub._id}:opening_balance`,
      reason: `رصيد افتتاحي — باقة "${pkg.nameAr}"${reasonSuffix}`,
      relatedSubscriptionId: sub._id, performedByRole: actorRole, performedBy: actorId,
      metadata: { packageTotal: pkg.sessionsPerMonth, lessonsUsedAtOpening: used, lessonsRemainingAtOpening: remaining },
    })
    sub.walletTransactionId = transaction._id
    await sub.save()
    return { subscription: sub, package: pkg, transaction, used, remaining }
  } catch (err) {
    // Compensating rollback — never leave a Subscription on record with no
    // matching wallet credit (MongoDB here is a standalone mongod, no
    // multi-document transactions available — see wallet.service.js).
    await Subscription.deleteOne({ _id: sub._id }).catch(() => {})
    throw err
  }
}

module.exports = { createSubscriptionWithOpeningBalance, SubscriptionCreationError, OpeningBalanceError }

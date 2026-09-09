// Subscription renewal — approval execution (Phase 2 §9). Mirrors
// enrollment.controller.js's proven approve-path shape (new Subscription +
// additive LessonWallet credit) but factored into a real service function
// (unlike enrollment's, which lives inline in the controller) because this
// one has a second moving part: an optional teacher change, which MUST
// reuse the existing transfer.service.js primitive rather than a second,
// competing reassignment implementation.
const Subscription = require('../models/Subscription')
const Package = require('../models/Package')
const ScheduleRule = require('../models/ScheduleRule')
const SubscriptionRenewalRequest = require('../models/SubscriptionRenewalRequest')
const walletService = require('./wallet.service')
const transferService = require('./transfer.service')

class RenewalError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

/**
 * Executes an approved renewal request. Order matters: if a teacher change
 * is requested, the transfer runs FIRST — if it fails (a real availability
 * conflict), nothing else has been created yet, so there is nothing to roll
 * back. Only once the (possible) transfer succeeds does the new billing-
 * cycle Subscription get created, then the wallet gets credited additively
 * (compensating-deleted if that specific step fails — same pattern as
 * subscription.service.js#createSubscriptionWithOpeningBalance).
 */
async function executeRenewal(requestId, { actorId }) {
  const request = await SubscriptionRenewalRequest.findById(requestId).populate('requestedPackageId')
  if (!request) throw new RenewalError('طلب التجديد غير موجود', 404)
  if (!['pending', 'under_review'].includes(request.status)) {
    throw new RenewalError('تم البت في هذا الطلب مسبقًا', 409)
  }

  const currentSub = await Subscription.findById(request.currentSubscriptionId)
  if (!currentSub) throw new RenewalError('الاشتراك الحالي غير موجود', 404)

  const pkg = request.requestedPackageId || await Package.findById(currentSub.packageId)
  if (!pkg) throw new RenewalError('الباقة غير موجودة', 404)
  if (!pkg.isActive) throw new RenewalError('لا يمكن استخدام باقة غير مُفعّلة', 400)

  const targetTeacherId = request.requestedTeacherId || currentSub.teacherId
  const teacherChanged = String(targetTeacherId) !== String(currentSub.teacherId)

  let transfer = null
  if (teacherChanged) {
    const result = await transferService.executeStudentTransfer(request.studentId, {
      targetTeacherId, reason: 'تغيير معلم ضمن تجديد الاشتراك', scheduleDecisions: {}, actorId,
      idempotencyKey: `renewal-request:${request._id}:transfer`,
    })
    transfer = result.transfer
  }

  const start = new Date()
  const end = new Date(start.getTime() + (pkg.durationDays || 30) * 24 * 60 * 60 * 1000)

  const renewed = await Subscription.create({
    studentId: request.studentId, packageId: pkg._id, packageNameAr: pkg.nameAr,
    teacherId: targetTeacherId, startDate: start, endDate: end, billingDate: start, renewalDate: end,
    sessionsRemaining: 0, totalSessions: 0, // wallet-mirrored below, never a fresh grant on the OLD doc
    amountPaid: request.amount || pkg.price, notes: request.adminNotes,
    createdBy: actorId, renewedFromSubscriptionId: currentSub._id, status: 'active',
  })

  try {
    const { transaction } = await walletService.applyTransaction({
      studentId: request.studentId, type: 'renewal', amount: pkg.sessionsPerMonth,
      idempotencyKey: `renewal-request:${request._id}:renew`,
      reason: `تجديد باقة "${pkg.nameAr}"`,
      relatedSubscriptionId: renewed._id, performedByRole: 'admin', performedBy: actorId,
    })
    renewed.walletTransactionId = transaction._id
    await renewed.save()

    currentSub.renewsIntoSubscriptionId = renewed._id
    await currentSub.save()

    // Points already-active schedule rules at the NEW subscription so future
    // sessions' wallet transactions (see lessonDeduction.service.js) audit-
    // trail against the current billing cycle, not the one just renewed
    // from — purely additive/informational, never moves or regenerates the
    // schedule itself (that already happened above via transfer, if requested).
    await ScheduleRule.updateMany(
      { studentId: request.studentId, teacherId: targetTeacherId, status: 'active' },
      { $set: { subscriptionId: renewed._id } }
    )

    request.status = 'approved'
    request.resultingSubscriptionId = renewed._id
    request.resultingTransferId = transfer?._id
    request.walletTransactionId = transaction._id
    request.reviewedBy = actorId
    request.reviewedAt = new Date()
    await request.save()

    return { request, subscription: renewed, transfer }
  } catch (err) {
    // Compensating rollback — never leave a renewed Subscription on record
    // with no matching wallet credit (no multi-document transactions on
    // this standalone mongod — see wallet.service.js's own doc-comment).
    await Subscription.deleteOne({ _id: renewed._id }).catch(() => {})
    throw err
  }
}

module.exports = { executeRenewal, RenewalError }

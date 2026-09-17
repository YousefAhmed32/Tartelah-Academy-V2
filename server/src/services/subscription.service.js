// Shared subscription-creation logic — used by both the standalone
// POST /subscriptions endpoint (subscription.controller.js) and the teacher
// onboarding wizard (onboarding.service.js), so the "package → opening
// balance → wallet credit" flow only exists in one place.
const Subscription = require('../models/Subscription')
const Package = require('../models/Package')
const Session = require('../models/Session')
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const walletService = require('./wallet.service')
const { recordEntry } = require('./payrollLedger.service')
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
  lessonsUsed, lessonsRemaining, durationMinutes, actorId, actorRole = 'admin',
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

  let openingTransaction = null
  const importedSessionIds = []

  try {
    const reasonSuffix = used > 0 ? ` (منها ${used} حصة مستخدمة مسبقًا)` : ''
    const { transaction } = await walletService.applyTransaction({
      studentId, type: 'opening_balance', amount: remaining,
      idempotencyKey: `subscription:${sub._id}:opening_balance`,
      reason: `رصيد افتتاحي — باقة "${pkg.nameAr}"${reasonSuffix}`,
      relatedSubscriptionId: sub._id, performedByRole: actorRole, performedBy: actorId,
      metadata: { packageTotal: pkg.sessionsPerMonth, lessonsUsedAtOpening: used, lessonsRemainingAtOpening: remaining },
    })
    openingTransaction = transaction
    sub.walletTransactionId = transaction._id
    await sub.save()

    // Imported off-platform lessons are represented as real completed sessions
    // plus payable payroll-ledger rows. This makes the credit immediately visible
    // in the teacher's current open payroll period without asking for a report for
    // historical lessons that were delivered before the platform tracked them.
    if (teacherId && used > 0) {
      let studentName = ''
      try {
        const User = require('../models/User')
        const st = await User.findById(studentId).select('firstNameAr lastNameAr name').lean()
        if (st) {
          studentName = st.firstNameAr ? `${st.firstNameAr} ${st.lastNameAr || ''}`.trim() : (st.name || '')
        }
      } catch (_) {}

      const importedAt = new Date()
      for (let i = 0; i < used; i++) {
        const seqTitle = studentName
          ? `حصة ${studentName} (${i + 1} من ${pkg.sessionsPerMonth})`
          : `حصة سابقة (${i + 1} من ${pkg.sessionsPerMonth})`
        const pastSession = await Session.create({
          studentId,
          teacherId,
          subscriptionId: sub._id,
          titleAr: seqTitle,
          scheduledAt: new Date(importedAt.getTime() + i),
          durationMinutes: Number(durationMinutes) || 60,
          status: 'completed',
          quranReportRequired: false,
          completedAt: importedAt,
          subscriptionConsumed: true,
          subscriptionConsumedAt: importedAt,
          payrollStatus: 'payable',
          payrollStatusReason: 'حصة سابقة معتمدة عند إسناد الطالب',
          payrollStatusSetBy: 'system',
          payrollStatusSetAt: importedAt,
          teacherAttendanceStatus: 'on_time',
          attendanceFinalizedAt: importedAt,
          attendanceFinalizedBy: actorId,
          notes: `حصة سابقة معتمدة عند إسناد الطالب بالباقة (${pkg.nameAr}) — لا يلزمها تقرير قرآني`,
        })
        importedSessionIds.push(pastSession._id)

        const payrollEntry = await recordEntry(pastSession, {
          payrollStatus: 'payable',
          reason: `حصة سابقة معتمدة عند إسناد الطالب بالباقة (${pkg.nameAr})`,
          businessRule: 'opening_balance_consumed',
          createdBy: actorId,
        })
        if (!payrollEntry) throw new Error('تعذر إضافة الحصة السابقة إلى راتب المعلم')
      }
    }

    return { subscription: sub, package: pkg, transaction, used, remaining, importedSessionIds }
  } catch (err) {
    // Standalone MongoDB has no multi-document transaction support here, so
    // compensate every completed write. Never report success with only some
    // imported lessons credited to the teacher.
    if (importedSessionIds.length) {
      await TeacherPayrollEntry.deleteMany({ sessionId: { $in: importedSessionIds } }).catch(() => {})
      await Session.deleteMany({ _id: { $in: importedSessionIds } }).catch(() => {})
    }
    if (openingTransaction) {
      await walletService.applyTransaction({
        studentId,
        type: 'opening_balance',
        amount: -remaining,
        idempotencyKey: `subscription:${sub._id}:opening_balance:rollback`,
        reason: `إلغاء رصيد افتتاحي لاكتمال إسناد الحصص السابقة بخطأ`,
        relatedSubscriptionId: sub._id,
        performedByRole: actorRole,
        performedBy: actorId,
        correctsTransactionId: openingTransaction._id,
        metadata: { packageTotal: -pkg.sessionsPerMonth, lessonsUsedAtOpening: -used, rollback: true },
      }).catch(() => {})
    }
    await Subscription.deleteOne({ _id: sub._id }).catch(() => {})
    throw err
  }
}

module.exports = { createSubscriptionWithOpeningBalance, SubscriptionCreationError, OpeningBalanceError }

const walletService = require('./wallet.service')
const compensationService = require('./compensation.service')
const { isWithinCancellationWindow } = require('../config/lessonPolicy')

// Single source of truth for the platform's lesson-deduction matrix. Every
// caller that resolves a session's attendance or cancellation goes through
// here instead of touching the wallet directly, so the business rules below
// are defined exactly once:
//
//   Completed (present/late/left_early)        -> deduct 1, no compensation
//   Student no-show (absent, teacher held it)   -> deduct 1, teacher still paid
//   Excused absence / technical issue           -> no deduction (admin-correctable)
//   Teacher cancelled (any time)                -> no deduction, auto-compensation
//   Teacher no-show (sweep-detected)            -> no deduction, auto-compensation
//   Student cancelled before the window         -> no deduction (credit returned)
//   Student cancelled after the window          -> deduct 1 (treated as used)
//
// Teacher payroll is a fully independent concern (see sessionIntelligence.
// service.js computePayrollStatus) — it depends only on teacher check-in,
// never on the student outcomes below. That rule is preserved unchanged.

// Attendance statuses that consume a wallet lesson. Includes 'absent' as of
// the Lesson Wallet redesign: an unexcused student no-show still costs the
// student a lesson (the teacher held the slot) — this is a deliberate
// business-rule change from the old subscription model, which never
// deducted for any non-present status. 'excused' and 'technical_issue'
// remain non-consuming and stay admin-correctable either way.
const CONSUMING_ATTENDANCE_STATUSES = ['present', 'late', 'left_early', 'absent']

function nextIdempotencyKey(session, action) {
  const seq = (session.lessonConsumptionSeq || 0) + 1
  return `session:${session._id}:${action}:${seq}`
}

/** Deducts one lesson from the session's student, unless already consumed. */
async function consumeLesson(session, { reason, performedByRole = 'system', performedBy } = {}) {
  if (session.subscriptionConsumed) return { alreadyApplied: true }
  const nextSeq = (session.lessonConsumptionSeq || 0) + 1
  const { transaction, alreadyApplied } = await walletService.applyTransaction({
    studentId: session.studentId,
    type: 'consumption',
    amount: -1,
    idempotencyKey: nextIdempotencyKey(session, 'consume'),
    reason: reason || 'حصة مستهلكة — تم خصمها من الرصيد',
    relatedSessionId: session._id,
    relatedSubscriptionId: session.subscriptionId,
    performedByRole, performedBy,
  })
  session.subscriptionConsumed = true
  session.subscriptionConsumedAt = new Date()
  session.lessonConsumedTransactionId = transaction._id
  session.lessonConsumptionSeq = nextSeq
  return { alreadyApplied, transaction }
}

/** Reverses this session's consumption, unless it was never consumed. */
async function releaseLesson(session, { reason, performedByRole = 'system', performedBy } = {}) {
  if (!session.subscriptionConsumed) return { alreadyApplied: true }
  const consumedTxnId = session.lessonConsumedTransactionId
  const key = consumedTxnId
    ? `session:${session._id}:release:${consumedTxnId}`
    : `session:${session._id}:release:${session.lessonConsumptionSeq || 0}`
  const { transaction, alreadyApplied } = await walletService.applyTransaction({
    studentId: session.studentId,
    type: 'reversal',
    amount: 1,
    idempotencyKey: key,
    reason: reason || 'استرجاع حصة لم تُستهلك فعلياً',
    relatedSessionId: session._id,
    relatedSubscriptionId: session.subscriptionId,
    performedByRole, performedBy,
    correctsTransactionId: consumedTxnId,
  })
  session.subscriptionConsumed = false
  session.subscriptionConsumedAt = null
  session.lessonConsumedTransactionId = undefined
  return { alreadyApplied, transaction }
}

/**
 * Applies or reverses consumption based on the student's CURRENT attendance
 * status. Idempotent (a no-op re-run with the same status), and a later
 * correction (e.g. present -> excused) automatically gives the lesson back.
 * Mutates `session` in memory only — caller must still session.save() it.
 */
async function syncLessonConsumption(session, attendanceStatus, opts = {}) {
  const shouldConsume = CONSUMING_ATTENDANCE_STATUSES.includes(attendanceStatus)
  if (shouldConsume && !session.subscriptionConsumed) {
    await consumeLesson(session, { reason: 'حضور الطالب — تم خصم الحصة', ...opts })
  } else if (!shouldConsume && session.subscriptionConsumed) {
    await releaseLesson(session, { reason: 'تصحيح الحضور — تم إرجاع الحصة', ...opts })
  }
}

/**
 * Resolves the wallet impact of a session cancellation. `cancelledByRole`
 * must be the EFFECTIVE cancelling party (teacher/admin/student) — when an
 * admin cancels on a student's behalf, pass 'student' so the window rule
 * still applies (mirrors the existing outcome-labeling logic in
 * session.controller.js cancelSession).
 */
async function handleCancellation(session, { cancelledByRole, now = new Date(), reason, performedBy } = {}) {
  if (cancelledByRole === 'teacher' || cancelledByRole === 'admin') {
    await releaseLesson(session, { reason: 'إلغاء من الأكاديمية — إرجاع الحصة', performedByRole: cancelledByRole, performedBy })
    await compensationService.grantCompensation(session, {
      reason: reason || 'إلغاء الحصة من طرف الأكاديمية',
      grantedByRole: cancelledByRole, grantedBy: performedBy,
    })
    return { deducted: false, compensationGranted: true }
  }

  if (isWithinCancellationWindow(session.scheduledAt, now)) {
    await releaseLesson(session, { reason: 'إلغاء الطالب ضمن المهلة المسموحة — إرجاع الحصة', performedByRole: 'student', performedBy })
    return { deducted: false, compensationGranted: false }
  }

  await consumeLesson(session, { reason: 'إلغاء الطالب بعد المهلة المسموحة — خصم الحصة', performedByRole: 'student', performedBy })
  return { deducted: true, compensationGranted: false }
}

/** Teacher no-show (sweep-detected): never costs the student, auto-compensated. */
async function handleTeacherNoShow(session, { reason, performedBy } = {}) {
  await releaseLesson(session, { reason: 'غياب المعلم — إرجاع الحصة', performedByRole: 'system', performedBy })
  const result = await compensationService.grantCompensation(session, {
    reason: reason || 'غياب المعلم عن الحصة — حصة تعويضية',
    grantedByRole: 'system', grantedBy: performedBy,
  })
  return { deducted: false, compensationGranted: true, ...result }
}

module.exports = {
  CONSUMING_ATTENDANCE_STATUSES,
  consumeLesson, releaseLesson, syncLessonConsumption,
  handleCancellation, handleTeacherNoShow,
}

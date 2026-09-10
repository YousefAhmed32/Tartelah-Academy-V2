// Active-student transfer between teachers (Phase 2 meeting addendum §3) —
// the canonical primitive both the single-student transfer endpoint AND
// teacherReplacement.service.js's bulk batches call, so transfer logic never
// exists in two places. Deliberately separate from assignment.service.js's
// AssignmentRequest reassignment: that governs a PENDING request before a
// student is ever active; this moves an ALREADY-ACTIVE student's future
// operational ownership — the two never touch each other's data.
//
// MongoDB here is a standalone mongod (no multi-document transactions — see
// wallet.service.js). Follows the same established pattern: validate/
// re-validate everything (including a final server-side availability
// re-check — never trust a slot the client merely previewed earlier), write
// while tracking exactly what this call created, and on failure run an
// explicit compensating rollback.
const User = require('../models/User')
const Subscription = require('../models/Subscription')
const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const StudentTransfer = require('../models/StudentTransfer')
const availabilityService = require('./availability.service')
const scheduleService = require('./schedule.service')
const { createNotifications } = require('./notification.service')
const { logAction } = require('./audit.service')

class TransferError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

async function loadStudentAndSubscription(studentId) {
  const student = await User.findOne({ _id: studentId, role: 'student' })
  if (!student) throw new TransferError('الطالب غير موجود', 404)
  const subscription = await Subscription.findOne({ studentId, status: 'active' }).sort({ createdAt: -1 })
  if (!subscription) throw new TransferError('لا يوجد اشتراك نشط لهذا الطالب لنقله', 409)
  if (!subscription.teacherId) throw new TransferError('الاشتراك النشط غير مرتبط بمعلم حالي', 409)
  return { student, subscription }
}

async function assertTargetTeacherValid(targetTeacherId, oldTeacherId) {
  if (String(targetTeacherId) === String(oldTeacherId)) {
    throw new TransferError('المعلم الجديد يجب أن يكون مختلفًا عن المعلم الحالي', 400, 'targetTeacherId')
  }
  const teacher = await User.findOne({ _id: targetTeacherId, role: 'teacher' })
  if (!teacher) throw new TransferError('المعلم المستهدف غير موجود', 404, 'targetTeacherId')
  if (teacher.isActive === false) throw new TransferError('لا يمكن النقل إلى معلم غير مُفعّل', 409, 'targetTeacherId')
  return teacher
}

/**
 * Computes, per active ScheduleRule, whether the SAME day/time is free with
 * the target teacher, and real availability-derived alternatives when not —
 * never a guess. Read-only; writes nothing.
 */
async function computeScheduleResolution({ studentId, targetTeacherId, oldRules }) {
  // Every old rule for this student is excluded from both the teacher- and
  // student-side busy calculation: these rules are about to be ended as
  // part of the very transfer being checked, so the student's own current
  // slot at the old teacher must never register as a conflict against
  // itself (real bug caught during integration rehearsal — see
  // availability.service.js's loadBusyByDay doc-comment).
  const excludeScheduleRuleIds = oldRules.map((r) => r._id)
  const results = []
  for (const rule of oldRules) {
    const days = [{ dayOfWeek: rule.daysOfWeek?.[0] ?? new Date(rule.startDate).getDay(), time: rule.timeOfDay }]
    // A weekly rule may span multiple daysOfWeek — check every one.
    const allDays = (rule.daysOfWeek?.length ? rule.daysOfWeek : days.map((d) => d.dayOfWeek))
      .map((dow) => ({ dayOfWeek: dow, time: rule.timeOfDay }))

    const check = await availabilityService.checkAvailability({
      teacherId: targetTeacherId, studentId, days: allDays,
      durationMinutes: rule.durationMinutes, timezone: rule.timezone, excludeScheduleRuleIds,
    })

    let alternatives = []
    if (!check.valid) {
      alternatives = await availabilityService.suggestAlternativeSlots({
        teacherId: targetTeacherId, days: allDays, durationMinutes: rule.durationMinutes, timezone: rule.timezone,
        excludeScheduleRuleIds, maxResults: 3,
      })
    }

    results.push({ rule, days: allDays, valid: check.valid, conflicts: check.conflicts, alternatives })
  }
  return results
}

/**
 * Preview-only — computes exactly what a transfer WOULD change, without
 * writing anything. Powers the admin confirmation screen.
 */
async function previewStudentTransfer(studentId, { targetTeacherId, effectiveDate }) {
  const { student, subscription } = await loadStudentAndSubscription(studentId)
  const oldTeacher = await User.findOne({ _id: subscription.teacherId, role: 'teacher' })
  const newTeacher = await assertTargetTeacherValid(targetTeacherId, subscription.teacherId)

  const effective = effectiveDate ? new Date(effectiveDate) : new Date()
  if (Number.isNaN(effective.getTime())) throw new TransferError('تاريخ السريان غير صالح', 400, 'effectiveDate')

  const [oldRules, futureSessions, wallet] = await Promise.all([
    ScheduleRule.find({ studentId, teacherId: subscription.teacherId, status: 'active' }),
    Session.find({ studentId, teacherId: subscription.teacherId, status: 'scheduled', scheduledAt: { $gte: effective } }).sort({ scheduledAt: 1 }),
    require('./wallet.service').getWallet(studentId),
  ])

  const scheduleResolution = await computeScheduleResolution({ studentId, targetTeacherId, oldRules })

  return {
    student: student.toPublic(), oldTeacher: oldTeacher?.toPublic(), newTeacher: newTeacher.toPublic(),
    subscription, walletRemaining: wallet?.remaining ?? 0,
    scheduleResolution, futureSessionsCount: futureSessions.length, effectiveDate: effective,
    unchanged: { walletBalance: wallet?.remaining ?? 0, historicalSessions: true, attendanceReportsPayroll: 'يبقى تحت المعلم الحالي كسجل تاريخي' },
  }
}

/**
 * Executes the transfer. `scheduleDecisions` (optional) maps
 * `{ [scheduleRuleId]: { dayOfWeek, time } | 'keep' }` — the admin's final
 * chosen slot per old rule (required whenever that rule's kept slot
 * conflicts; a 'keep' entry, or omission, means "use the existing day/time
 * as-is"). Everything is re-validated server-side regardless of what the
 * client previewed earlier.
 */
async function executeStudentTransfer(studentId, {
  targetTeacherId, effectiveDate, reason, scheduleDecisions = {}, actorId, batchId = null, idempotencyKey = null,
}) {
  if (!reason?.trim()) throw new TransferError('سبب النقل مطلوب', 400, 'reason')
  if (!actorId) throw new TransferError('منفذ العملية مطلوب', 400)
  if (!targetTeacherId) throw new TransferError('يجب اختيار المعلم الجديد', 400, 'targetTeacherId')

  // Idempotency: a retried/duplicate call with the same key is a safe no-op.
  if (idempotencyKey) {
    const existing = await StudentTransfer.findOne({ idempotencyKey })
    if (existing) return { transfer: existing, alreadyExecuted: true }
  }

  const { student, subscription } = await loadStudentAndSubscription(studentId)
  const oldTeacherId = subscription.teacherId
  const newTeacher = await assertTargetTeacherValid(targetTeacherId, oldTeacherId)

  const effective = effectiveDate ? new Date(effectiveDate) : new Date()
  if (Number.isNaN(effective.getTime())) throw new TransferError('تاريخ السريان غير صالح', 400, 'effectiveDate')

  const [oldRules, futureSessions, wallet] = await Promise.all([
    ScheduleRule.find({ studentId, teacherId: oldTeacherId, status: 'active' }),
    Session.find({ studentId, teacherId: oldTeacherId, status: 'scheduled', scheduledAt: { $gte: effective } }),
    require('./wallet.service').getWallet(studentId),
  ])

  // Final, authoritative server-side re-validation of every chosen slot —
  // never trust what the client's preview showed earlier. The student's own
  // about-to-end old rules are excluded from the busy calculation for the
  // same reason as computeScheduleResolution above.
  const excludeScheduleRuleIds = oldRules.map((r) => r._id)
  const finalDays = []
  const scheduleChanges = []
  for (const rule of oldRules) {
    const decision = scheduleDecisions[String(rule._id)]
    const chosenDays = (decision && decision !== 'keep')
      ? [{ dayOfWeek: decision.dayOfWeek, time: decision.time }]
      : (rule.daysOfWeek?.length ? rule.daysOfWeek : [rule.daysOfWeek?.[0] ?? new Date(rule.startDate).getDay()])
          .map((dow) => ({ dayOfWeek: dow, time: rule.timeOfDay }))

    const check = await availabilityService.checkAvailability({
      teacherId: targetTeacherId, studentId, days: chosenDays,
      durationMinutes: rule.durationMinutes, timezone: rule.timezone, excludeScheduleRuleIds,
    })
    if (!check.valid) {
      throw new TransferError(
        `الموعد المختار لجدول الطالب لم يعد متاحًا لدى المعلم الجديد — يرجى إعادة المعاينة واختيار موعد آخر`,
        409, `scheduleDecisions.${rule._id}`
      )
    }

    for (const d of chosenDays) {
      scheduleChanges.push({
        oldScheduleRuleId: rule._id, dayOfWeek: d.dayOfWeek,
        oldTime: rule.timeOfDay, newTime: d.time,
        changed: d.time !== rule.timeOfDay || (rule.daysOfWeek?.length === 1 && rule.daysOfWeek[0] !== d.dayOfWeek),
      })
    }
    finalDays.push({ rule, chosenDays })
  }

  let transferDoc = null
  const createdRuleIds = []
  const createdSessionIds = []
  const cancelledSessionIds = futureSessions.map((s) => s._id)

  try {
    // 1) End the old teacher's active rules for this student — future
    // ownership only; every past Session (attendance/reports/payroll) keeps
    // pointing at the old teacherId untouched, forever.
    if (oldRules.length) {
      await ScheduleRule.updateMany({ _id: { $in: oldRules.map((r) => r._id) } }, { $set: { status: 'ended', endDate: effective } })
    }

    // 2) Cancel the old teacher's not-yet-happened sessions — they will
    // never occur under that teacher; historical (past) sessions are
    // untouched because the query only ever selected scheduledAt >= effective.
    if (cancelledSessionIds.length) {
      await Session.updateMany(
        { _id: { $in: cancelledSessionIds } },
        {
          $set: {
            status: 'cancelled', cancelledAt: new Date(), cancelledBy: actorId,
            cancelReason: 'تم نقل الطالب إلى معلم آخر',
            payrollStatus: 'excluded', payrollStatusReason: 'student_transferred',
            payrollStatusSetBy: 'admin', payrollStatusSetAt: new Date(),
          },
        }
      )
    }

    // 3) Create the new teacher's ScheduleRule(s) — one per distinct
    // duration/timezone grouping (a rule set normally shares these, so this
    // is one new rule per old rule, carrying the resolved days).
    let targetMeetingLink = ''
    let targetMeetingProvider = 'zoom'
    try {
      const targetTeacher = await User.findById(targetTeacherId).select('meetingLinks').lean()
      if (targetTeacher?.meetingLinks?.[0]?.link) {
        targetMeetingLink = targetTeacher.meetingLinks[0].link
        targetMeetingProvider = targetTeacher.meetingLinks[0].provider || targetMeetingProvider
      }
    } catch (_) {}

    const newRuleByOldRuleId = {}
    for (const { rule, chosenDays } of finalDays) {
      const newRule = await ScheduleRule.create({
        teacherId: targetTeacherId, studentId, subscriptionId: subscription._id,
        frequency: rule.frequency, daysOfWeek: chosenDays.map((d) => d.dayOfWeek),
        timeOfDay: chosenDays[0]?.time || rule.timeOfDay, durationMinutes: rule.durationMinutes,
        startDate: effective, sessionsTotal: rule.sessionsTotal,
        meetingLink: targetMeetingLink || rule.meetingLink || '',
        meetingProvider: targetMeetingProvider || rule.meetingProvider || 'zoom',
        titleTemplate: rule.titleTemplate, status: 'active', timezone: rule.timezone,
        notes: `منقول من جدول سابق (${rule._id}) — سبب النقل: ${reason.trim()}`,
      })
      createdRuleIds.push(newRule._id)
      newRuleByOldRuleId[String(rule._id)] = newRule
      const generated = await scheduleService.generateSessionsFromRule(newRule)
      generated.forEach((s) => createdSessionIds.push(s._id))
    }
    scheduleChanges.forEach((c) => { c.newScheduleRuleId = newRuleByOldRuleId[String(c.oldScheduleRuleId)]?._id })

    // 4) The active subscription's "current teacher" link moves forward —
    // billing/history rows (Subscription document itself) are otherwise
    // unchanged; wallet balance is never touched by this operation at all.
    await Subscription.updateOne({ _id: subscription._id }, { $set: { teacherId: targetTeacherId } })

    transferDoc = await StudentTransfer.create({
      studentId, oldTeacherId, newTeacherId: targetTeacherId, subscriptionId: subscription._id,
      reason: reason.trim(), effectiveDate: effective, status: 'completed',
      scheduleChanges, oldScheduleRuleIds: oldRules.map((r) => r._id), newScheduleRuleIds: createdRuleIds,
      cancelledSessionIds, createdSessionIds, walletBalanceAtTransfer: wallet?.remaining ?? 0,
      batchId, idempotencyKey, actorId,
    })

    logAction({
      actorId, actorRole: 'admin', action: 'student.transfer',
      entity: 'User', entityId: studentId,
      changes: { oldTeacherId, newTeacherId: targetTeacherId, reason: reason.trim(), ruleCount: oldRules.length, sessionCancelled: cancelledSessionIds.length, sessionCreated: createdSessionIds.length },
    })

    await notifyTransferParties({ student, oldTeacherId, newTeacher, subscription, reason: reason.trim() })

    return { transfer: transferDoc, alreadyExecuted: false }
  } catch (err) {
    // Compensating rollback — never leave a partial transfer silently
    // "succeeded". Restores exactly what THIS call changed.
    await Promise.allSettled([
      transferDoc ? null : Subscription.updateOne({ _id: subscription._id, teacherId: targetTeacherId }, { $set: { teacherId: oldTeacherId } }),
      createdRuleIds.length ? ScheduleRule.deleteMany({ _id: { $in: createdRuleIds } }) : null,
      createdSessionIds.length ? Session.deleteMany({ _id: { $in: createdSessionIds } }) : null,
      oldRules.length ? ScheduleRule.updateMany({ _id: { $in: oldRules.map((r) => r._id) }, status: 'ended' }, { $set: { status: 'active' }, $unset: { endDate: '' } }) : null,
      cancelledSessionIds.length ? Session.updateMany(
        { _id: { $in: cancelledSessionIds }, cancelReason: 'تم نقل الطالب إلى معلم آخر' },
        { $set: { status: 'scheduled' }, $unset: { cancelledAt: '', cancelledBy: '', cancelReason: '', payrollStatus: '', payrollStatusReason: '' } }
      ) : null,
    ].filter(Boolean))
    err.transferFailed = true
    throw err
  }
}

async function getStudentTransferHistory(studentId) {
  // Populated so the unified student profile can render real names, not
  // raw ObjectIds — this read was never surfaced in the UI before.
  return StudentTransfer.find({ studentId }).sort({ createdAt: -1 })
    .populate('oldTeacherId', 'firstNameAr lastNameAr avatar')
    .populate('newTeacherId', 'firstNameAr lastNameAr avatar')
    .populate('actorId', 'firstNameAr lastNameAr')
}

async function notifyTransferParties({ student, oldTeacherId, newTeacher, subscription, reason }) {
  const notifications = [
    {
      userId: student._id, titleAr: 'تم نقل حلقتك إلى معلم آخر',
      bodyAr: `تم نقل حلقتك إلى المعلم ${newTeacher.firstNameAr} ${newTeacher.lastNameAr} — ${reason}`,
      type: 'schedule', priority: 'high', actionUrl: '/student/schedule', relatedId: subscription._id,
    },
    {
      userId: newTeacher._id, titleAr: 'تم إسناد طالب جديد إليك (نقل)',
      bodyAr: `تم نقل طالب إلى حلقتك — ${reason}`,
      type: 'schedule', priority: 'high', actionUrl: '/teacher/students', relatedId: student._id,
    },
  ]
  if (oldTeacherId) {
    notifications.push({
      userId: oldTeacherId, titleAr: 'تم نقل أحد طلابك',
      bodyAr: `تم نقل أحد طلابك إلى معلم آخر — ${reason}. تبقى جميع سجلاته السابقة معك دون تغيير.`,
      type: 'schedule', priority: 'medium', actionUrl: '/teacher/students', relatedId: student._id,
    })
  }
  await createNotifications(notifications).catch(() => {})
}

module.exports = {
  previewStudentTransfer, executeStudentTransfer, getStudentTransferHistory,
  computeScheduleResolution, assertTargetTeacherValid, loadStudentAndSubscription, TransferError,
}

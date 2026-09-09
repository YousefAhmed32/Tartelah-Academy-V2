// Complete subscription pause/resume lifecycle (Phase 2 meeting addendum §2).
// Builds ONE coherent workflow on top of the pre-existing partial building
// blocks — wallet.service.js's freeze/resume (unchanged, reused as-is) and
// Subscription.status's existing 'paused' enum value — rather than a
// competing parallel system. The durable audit trail lives in
// models/SubscriptionPause.js (see that file for why it's separate from
// LessonWallet's single-slot freeze fields).
//
// MongoDB here is a standalone mongod (no multi-document transactions — see
// wallet.service.js). Every write below follows the same established
// pattern used throughout this codebase: validate everything up front, then
// write while tracking exactly what THIS call created/changed, and on
// failure run an explicit compensating rollback.
const Subscription = require('../models/Subscription')
const SubscriptionPause = require('../models/SubscriptionPause')
const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const User = require('../models/User')
const walletService = require('./wallet.service')
const scheduleService = require('./schedule.service')
const { createNotifications } = require('./notification.service')
const { logAction } = require('./audit.service')

class SubscriptionLifecycleError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

async function loadSubscription(subscriptionId) {
  const sub = await Subscription.findById(subscriptionId)
  if (!sub) throw new SubscriptionLifecycleError('الاشتراك غير موجود', 404)
  return sub
}

/**
 * Computes exactly what a pause WOULD do, without writing anything — the
 * confirmation preview the brief requires before an admin confirms.
 */
async function previewPause(subscriptionId, { effectiveDate } = {}) {
  const sub = await loadSubscription(subscriptionId)
  if (sub.status !== 'active') {
    throw new SubscriptionLifecycleError('لا يمكن إيقاف اشتراك ليس نشطًا حاليًا', 409)
  }
  const effective = effectiveDate ? new Date(effectiveDate) : new Date()
  if (Number.isNaN(effective.getTime())) throw new SubscriptionLifecycleError('تاريخ السريان غير صالح', 400, 'effectiveDate')

  const [wallet, scheduleRules, futureSessions] = await Promise.all([
    walletService.getWallet(sub.studentId),
    ScheduleRule.find({ studentId: sub.studentId, teacherId: sub.teacherId, status: 'active' }),
    Session.find({ studentId: sub.studentId, teacherId: sub.teacherId, status: 'scheduled', scheduledAt: { $gte: effective } }).sort({ scheduledAt: 1 }),
  ])

  return {
    subscription: sub,
    walletRemaining: wallet?.remaining ?? 0,
    affectedScheduleRules: scheduleRules,
    affectedSessionsCount: futureSessions.length,
    affectedSessions: futureSessions.slice(0, 20), // preview sample — full list not needed to decide
    effectiveDate: effective,
  }
}

/**
 * Pauses a subscription: subscription -> 'paused', wallet frozen (balance
 * untouched), active recurring ScheduleRules -> 'paused', and every
 * already-generated future session cancelled + excluded from payroll (never
 * charged to the student, never paid to the teacher). Idempotent: calling
 * again on an already-paused subscription returns the existing open pause
 * record rather than creating a second one (also enforced by
 * SubscriptionPause's partial unique index as the real safety net).
 */
async function pauseSubscription(subscriptionId, { reason, effectiveDate, plannedResumeDate, actorId }) {
  if (!reason?.trim()) throw new SubscriptionLifecycleError('سبب الإيقاف مطلوب', 400, 'reason')
  if (!actorId) throw new SubscriptionLifecycleError('منفذ العملية مطلوب', 400)

  const sub = await loadSubscription(subscriptionId)

  // Idempotency: an already-open pause for this subscription is returned
  // as-is rather than erroring or double-processing a retried/double-click.
  const existingOpen = await SubscriptionPause.findOne({ subscriptionId: sub._id, status: 'active' })
  if (existingOpen) return { pause: existingOpen, subscription: sub, alreadyPaused: true }

  if (sub.status !== 'active') {
    throw new SubscriptionLifecycleError('لا يمكن إيقاف اشتراك ليس نشطًا حاليًا (منتهي أو ملغي أو موقوف بالفعل)', 409)
  }

  const effective = effectiveDate ? new Date(effectiveDate) : new Date()
  if (Number.isNaN(effective.getTime())) throw new SubscriptionLifecycleError('تاريخ السريان غير صالح', 400, 'effectiveDate')
  const plannedResume = plannedResumeDate ? new Date(plannedResumeDate) : undefined
  if (plannedResumeDate && Number.isNaN(plannedResume?.getTime())) {
    throw new SubscriptionLifecycleError('تاريخ الاستئناف المتوقع غير صالح', 400, 'plannedResumeDate')
  }

  const [scheduleRules, futureSessions, wallet] = await Promise.all([
    ScheduleRule.find({ studentId: sub.studentId, teacherId: sub.teacherId, status: 'active' }),
    Session.find({ studentId: sub.studentId, teacherId: sub.teacherId, status: 'scheduled', scheduledAt: { $gte: effective } }),
    walletService.getOrCreateWallet(sub.studentId),
  ])
  const ruleIds = scheduleRules.map((r) => r._id)
  const sessionIds = futureSessions.map((s) => s._id)

  let pauseDoc = null
  try {
    // Create the audit record FIRST (before mutating anything) so a failure
    // partway through still leaves a durable trace of intent, and the
    // partial-unique index guards against a concurrent double-submit racing
    // this same check.
    pauseDoc = await SubscriptionPause.create({
      subscriptionId: sub._id, studentId: sub.studentId, teacherId: sub.teacherId,
      status: 'active', reason: reason.trim(), effectiveDate: effective, plannedResumeDate: plannedResume,
      pausedAt: new Date(), pausedBy: actorId,
      originalEndDate: sub.endDate, originalRenewalDate: sub.renewalDate,
      affectedScheduleRuleIds: ruleIds, affectedSessionIds: sessionIds,
      walletBalanceAtPause: wallet.remaining,
    })

    await Subscription.updateOne({ _id: sub._id }, { $set: { status: 'paused' } })

    if (ruleIds.length) {
      await ScheduleRule.updateMany({ _id: { $in: ruleIds } }, { $set: { status: 'paused' } })
    }
    if (sessionIds.length) {
      await Session.updateMany(
        { _id: { $in: sessionIds } },
        {
          $set: {
            status: 'cancelled', cancelledAt: new Date(), cancelledBy: actorId,
            cancelReason: 'تم إيقاف الاشتراك مؤقتًا',
            payrollStatus: 'excluded', payrollStatusReason: 'subscription_paused',
            payrollStatusSetBy: 'admin', payrollStatusSetAt: new Date(),
          },
        }
      )
    }

    // Wallet freeze — balance is untouched, only status flips (reused as-is).
    await walletService.freezeWallet(sub.studentId, { reason: reason.trim(), resumeAt: plannedResume, frozenBy: actorId })

    logAction({
      actorId, actorRole: 'admin', action: 'subscription.pause',
      entity: 'Subscription', entityId: sub._id,
      changes: {
        reason: reason.trim(), effectiveDate: effective, plannedResumeDate: plannedResume,
        affectedScheduleRuleCount: ruleIds.length, affectedSessionCount: sessionIds.length,
      },
    })

    await notifyPauseParties(sub, pauseDoc)

    return { pause: pauseDoc, subscription: await loadSubscription(sub._id), alreadyPaused: false }
  } catch (err) {
    // Compensating rollback — best-effort, never masks the original error.
    if (pauseDoc) {
      await Promise.allSettled([
        SubscriptionPause.deleteOne({ _id: pauseDoc._id }),
        Subscription.updateOne({ _id: sub._id, status: 'paused' }, { $set: { status: 'active' } }),
        ruleIds.length ? ScheduleRule.updateMany({ _id: { $in: ruleIds }, status: 'paused' }, { $set: { status: 'active' } }) : null,
        sessionIds.length ? Session.updateMany(
          { _id: { $in: sessionIds }, cancelReason: 'تم إيقاف الاشتراك مؤقتًا' },
          { $set: { status: 'scheduled' }, $unset: { cancelledAt: '', cancelledBy: '', cancelReason: '', payrollStatus: '', payrollStatusReason: '' } }
        ) : null,
      ].filter(Boolean))
    }
    throw err
  }
}

/**
 * Resumes a paused subscription: subscription -> 'active' with its
 * end/renewal dates extended by exactly the paused duration, wallet
 * unfrozen (balance preserved), the ScheduleRules THIS pause paused ->
 * 'active' again, and their future occurrences regenerated (idempotent via
 * Session's unique {seriesId, scheduledAt} index — never duplicates).
 * Idempotent: resuming an already-active subscription with no open pause
 * record is a safe no-op that returns the most recent (already-resumed)
 * record instead of erroring.
 */
async function resumeSubscription(subscriptionId, { actorId }) {
  if (!actorId) throw new SubscriptionLifecycleError('منفذ العملية مطلوب', 400)
  const sub = await loadSubscription(subscriptionId)

  const openPause = await SubscriptionPause.findOne({ subscriptionId: sub._id, status: 'active' })
  if (!openPause) {
    const lastResumed = await SubscriptionPause.findOne({ subscriptionId: sub._id }).sort({ createdAt: -1 })
    if (sub.status !== 'paused' && lastResumed) return { pause: lastResumed, subscription: sub, alreadyResumed: true }
    throw new SubscriptionLifecycleError('لا يوجد إيقاف مفتوح لاستئنافه لهذا الاشتراك', 409)
  }

  const now = new Date()
  const pausedDurationMs = Math.max(0, now.getTime() - openPause.effectiveDate.getTime())
  const pausedDurationDays = Math.ceil(pausedDurationMs / (24 * 60 * 60 * 1000))

  const newEndDate = openPause.originalEndDate ? new Date(openPause.originalEndDate.getTime() + pausedDurationMs) : undefined
  const newRenewalDate = openPause.originalRenewalDate ? new Date(openPause.originalRenewalDate.getTime() + pausedDurationMs) : undefined

  const rulesToRestore = await ScheduleRule.find({ _id: { $in: openPause.affectedScheduleRuleIds }, status: 'paused' })
  const restoredRuleIds = rulesToRestore.map((r) => r._id)

  try {
    const subUpdate = { status: 'active' }
    if (newEndDate) subUpdate.endDate = newEndDate
    if (newRenewalDate) subUpdate.renewalDate = newRenewalDate
    await Subscription.updateOne({ _id: sub._id }, { $set: subUpdate })

    if (restoredRuleIds.length) {
      await ScheduleRule.updateMany({ _id: { $in: restoredRuleIds } }, { $set: { status: 'active' } })
    }

    // Regenerate only the future occurrences genuinely required — reuses
    // the exact same idempotent generator every other flow uses, so this
    // can never create a duplicate even if resume is retried.
    const regeneratedSessionIds = []
    for (const rule of rulesToRestore) {
      const created = await scheduleService.generateSessionsFromRule(rule)
      created.forEach((s) => regeneratedSessionIds.push(s._id))
    }

    await walletService.resumeWallet(sub.studentId, { resumedBy: actorId })

    const updatedPause = await SubscriptionPause.findOneAndUpdate(
      { _id: openPause._id, status: 'active' }, // guards a concurrent double-resume
      {
        $set: {
          status: 'resumed', resumedAt: now, resumedBy: actorId, resumeDurationDays: pausedDurationDays,
          newEndDate, newRenewalDate, restoredScheduleRuleIds: restoredRuleIds, regeneratedSessionIds,
        },
      },
      { new: true }
    )
    if (!updatedPause) {
      // Another concurrent call already resumed it between our read and
      // write — treat as the idempotent no-op case, not an error.
      const latest = await SubscriptionPause.findById(openPause._id)
      return { pause: latest, subscription: await loadSubscription(sub._id), alreadyResumed: true }
    }

    logAction({
      actorId, actorRole: 'admin', action: 'subscription.resume',
      entity: 'Subscription', entityId: sub._id,
      changes: { pausedDurationDays, restoredRuleCount: restoredRuleIds.length, regeneratedSessionCount: regeneratedSessionIds.length },
    })

    const finalSub = await loadSubscription(sub._id)
    await notifyResumeParties(finalSub, updatedPause)

    return { pause: updatedPause, subscription: finalSub, alreadyResumed: false }
  } catch (err) {
    // No compensating rollback attempted here deliberately: every write
    // above is itself independently idempotent (status guards, the unique
    // session index, wallet.service's own status check) — a retry of
    // resumeSubscription after a partial failure safely completes whatever
    // did not finish, rather than risking a rollback re-introducing the
    // exact "can't tell what state we're in" problem this design avoids.
    throw err
  }
}

async function getPauseHistory(studentId) {
  return SubscriptionPause.find({ studentId }).sort({ createdAt: -1 })
}

async function notifyPauseParties(sub, pauseDoc) {
  const notifications = [
    {
      userId: sub.studentId, titleAr: 'تم إيقاف اشتراكك مؤقتًا',
      bodyAr: `تم إيقاف اشتراكك مؤقتًا اعتبارًا من ${pauseDoc.effectiveDate.toLocaleDateString('ar-EG')} — السبب: ${pauseDoc.reason}`,
      type: 'subscription', priority: 'high', actionUrl: '/student/subscription', relatedId: sub._id,
    },
  ]
  if (sub.teacherId) {
    notifications.push({
      userId: sub.teacherId, titleAr: 'تم إيقاف اشتراك أحد طلابك مؤقتًا',
      bodyAr: `تم إيقاف اشتراك الطالب مؤقتًا — لن تُحتسب الحصص القادمة خلال فترة الإيقاف`,
      type: 'subscription', priority: 'medium', actionUrl: '/teacher/students', relatedId: sub._id,
    })
  }
  await createNotifications(notifications).catch(() => {})
}

async function notifyResumeParties(sub, pauseDoc) {
  const notifications = [
    {
      userId: sub.studentId, titleAr: 'تم استئناف اشتراكك',
      bodyAr: 'تم استئناف اشتراكك — يمكنك حجوز حصصك من جديد وفق الجدول المعتاد',
      type: 'subscription', priority: 'high', actionUrl: '/student/subscription', relatedId: sub._id,
    },
  ]
  if (sub.teacherId) {
    notifications.push({
      userId: sub.teacherId, titleAr: 'تم استئناف اشتراك أحد طلابك',
      bodyAr: 'تم استئناف الاشتراك واستعادة الجدول الدوري لهذا الطالب',
      type: 'subscription', priority: 'medium', actionUrl: '/teacher/students', relatedId: sub._id,
    })
  }
  const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').limit(20)
  admins.forEach((a) => notifications.push({
    userId: a._id, titleAr: 'استئناف اشتراك', bodyAr: `تم استئناف اشتراك بعد إيقاف دام ${pauseDoc.resumeDurationDays} يومًا`,
    type: 'subscription', priority: 'low', actionUrl: '/admin/students', relatedId: sub._id,
  }))
  await createNotifications(notifications).catch(() => {})
}

module.exports = { previewPause, pauseSubscription, resumeSubscription, getPauseHistory, SubscriptionLifecycleError }

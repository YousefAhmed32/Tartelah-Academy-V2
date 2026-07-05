const cron = require('node-cron')
const Session = require('../models/Session')
const User = require('../models/User')
const { createNotification, createNotifications } = require('../services/notification.service')
const { POLICY } = require('../config/attendancePolicy')
const { computePayrollStatus } = require('../services/sessionIntelligence.service')

// Graduated, forgiving sweep — see docs/INTELLIGENT_ATTENDANCE_SYSTEM.md
// "Human-Centered Flexible Time Windows". A teacher is never punished the
// instant a scheduled time passes; the system moves a stale session through
// softer states first and only reaches a hard (still admin-correctable)
// no_show/absent determination after a generous, configurable silence.
//
// Stage 1 (0 → POST_SESSION_GRACE_MINUTES + EXTENDED_COMPLETION_MINUTES
//          past scheduled end, i.e. MISSED_AFTER_MINUTES): left untouched —
//          the teacher still has full normal/late-completion editing rights.
// Stage 2 (MISSED_AFTER_MINUTES → ABSENCE_AFTER_MINUTES past end): status
//          flips to `missed` — a soft "unresolved, needs attention" signal.
//          teacherAttendanceStatus stays `pending`; nothing payroll-relevant
//          is decided yet, and the teacher can still check in/complete.
// Stage 3 (past ABSENCE_AFTER_MINUTES): status flips to `no_show`,
//          teacherAttendanceStatus becomes `absent`, payrollStatus becomes
//          `non_payable` — but this remains a system default an admin can
//          always correct, never an irreversible action.

async function sweepStale() {
  const now = new Date()
  let flaggedMissed = 0
  let flaggedAbsent = 0

  const stale = await Session.find({ status: 'scheduled' })
    .select('_id teacherId studentId titleAr scheduledAt durationMinutes status teacherAttendanceStatus outcome payrollStatus payrollStatusSetBy')
    .populate('teacherId', 'firstNameAr lastNameAr')

  for (const session of stale) {
    const end = new Date(new Date(session.scheduledAt).getTime() + (session.durationMinutes || 60) * 60000)
    const minutesPastEnd = (now.getTime() - end.getTime()) / 60000
    if (minutesPastEnd < POLICY.MISSED_AFTER_MINUTES) continue

    if (minutesPastEnd < POLICY.ABSENCE_AFTER_MINUTES) {
      if (session.status !== 'missed') {
        session.status = 'missed'
        await session.save()
        flaggedMissed++
        await createNotification({
          userId: session.teacherId._id,
          titleAr: 'حصة بحاجة لمتابعة',
          bodyAr: `حصة "${session.titleAr}" تجاوزت موعدها ولم يتم بدؤها بعد — يمكنك تسجيل الحضور أو إكمالها الآن`,
          type: 'attendance',
          priority: 'medium',
          relatedId: session._id,
        })
      }
      continue
    }

    // Stage 3 — hard (but correctable) resolution.
    session.status = 'no_show'
    session.teacherAttendanceStatus = 'absent'
    session.teacherAttendanceMarkedBy = 'system'
    session.outcome = 'teacher_absent'
    if (session.payrollStatusSetBy !== 'admin') {
      const { payrollStatus, reason } = computePayrollStatus(session)
      session.payrollStatus = payrollStatus
      session.payrollStatusReason = reason
      session.payrollStatusSetBy = 'system'
      session.payrollStatusSetAt = now
    }
    await session.save()
    flaggedAbsent++

    await createNotification({
      userId: session.teacherId._id,
      titleAr: 'حصة فائتة',
      bodyAr: `لم يتم بدء حصة "${session.titleAr}" في موعدها المحدد وتم تسجيلها كغياب. يمكنك مراسلة الإدارة إذا كان هناك سبب.`,
      type: 'attendance',
      priority: 'high',
      relatedId: session._id,
    })

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    if (admins.length) {
      await createNotifications(admins.map(admin => ({
        userId: admin._id,
        titleAr: 'تنبيه غياب معلم',
        bodyAr: `المعلم ${session.teacherId.firstNameAr} ${session.teacherId.lastNameAr} لم يحضر حصة "${session.titleAr}" في موعدها`,
        type: 'attendance',
        priority: 'urgent',
        relatedId: session._id,
      })))
    }
  }

  return { flaggedMissed, flaggedAbsent }
}

function startTeacherAttendanceSweepJob() {
  cron.schedule('*/10 * * * *', async () => {
    try {
      await sweepStale()
    } catch (err) {
      console.error('[CRON] Teacher attendance sweep error:', err.message)
    }
  }, { timezone: 'Asia/Riyadh' })

  console.log('[CRON] Teacher attendance sweep job started (graduated: missed → no_show)')
}

module.exports = { startTeacherAttendanceSweepJob, sweepStale }

const cron = require('node-cron')
const Session = require('../models/Session')
const User = require('../models/User')
const { createNotification, createNotifications } = require('../services/notification.service')

// Grace period after a session's scheduled end time before it's considered a no-show
const NO_SHOW_GRACE_MINUTES = 15

async function sweepNoShows() {
  const now = new Date()

  const stale = await Session.find({
    status: 'scheduled',
  }).select('_id teacherId studentId titleAr scheduledAt durationMinutes')
    .populate('teacherId', 'firstNameAr lastNameAr')

  let flagged = 0

  for (const session of stale) {
    const cutoff = new Date(
      new Date(session.scheduledAt).getTime() +
      (session.durationMinutes || 60) * 60000 +
      NO_SHOW_GRACE_MINUTES * 60000
    )
    if (now < cutoff) continue

    session.status = 'no_show'
    session.teacherAttendanceStatus = 'absent'
    session.teacherAttendanceMarkedBy = 'system'
    await session.save()
    flagged++

    await createNotification({
      userId: session.teacherId._id,
      titleAr: 'حصة فائتة',
      bodyAr: `لم يتم بدء حصة "${session.titleAr}" في موعدها المحدد وتم تسجيلها كغياب`,
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

  return flagged
}

function startTeacherAttendanceSweepJob() {
  cron.schedule('*/10 * * * *', async () => {
    try {
      await sweepNoShows()
    } catch (err) {
      console.error('[CRON] Teacher attendance sweep error:', err.message)
    }
  }, { timezone: 'Asia/Riyadh' })

  console.log('[CRON] Teacher attendance sweep job started')
}

module.exports = { startTeacherAttendanceSweepJob, sweepNoShows }

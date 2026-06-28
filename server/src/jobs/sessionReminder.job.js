const cron = require('node-cron')
const Session = require('../models/Session')
const User = require('../models/User')
const { createNotification } = require('../services/notification.service')
const { sendSessionReminderEmail } = require('../services/email.service')

const sentReminders = new Set()

async function sendReminders(hoursAhead, labelAr) {
  const now = new Date()
  const from = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000 - 5 * 60 * 1000)
  const to = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000 + 5 * 60 * 1000)

  const sessions = await Session.find({
    scheduledAt: { $gte: from, $lte: to },
    status: 'scheduled',
  }).populate('studentId teacherId', 'firstNameAr lastNameAr email')

  for (const session of sessions) {
    const key = `${session._id}_${hoursAhead}h`
    if (sentReminders.has(key)) continue
    sentReminders.add(key)

    const student = session.studentId
    const teacher = session.teacherId

    await createNotification({
      userId: student._id,
      titleAr: `تذكير: حصة بعد ${labelAr}`,
      bodyAr: `حصتك "${session.titleAr}" ستبدأ بعد ${labelAr}`,
      type: 'session',
      priority: hoursAhead <= 0.25 ? 'urgent' : hoursAhead <= 1 ? 'high' : 'medium',
      relatedId: session._id,
    })

    await createNotification({
      userId: teacher._id,
      titleAr: `تذكير: حصة بعد ${labelAr}`,
      bodyAr: `حصتك مع الطالب ${student.firstNameAr} ستبدأ بعد ${labelAr}`,
      type: 'session',
      priority: hoursAhead <= 0.25 ? 'urgent' : hoursAhead <= 1 ? 'high' : 'medium',
      relatedId: session._id,
    })

    if (hoursAhead === 24) {
      await sendSessionReminderEmail({
        to: student.email,
        name: student.firstNameAr,
        sessionTitle: session.titleAr,
        scheduledAt: session.scheduledAt,
        meetingLink: session.meetingLink,
      })
    }
  }
}

function startSessionReminderJob() {
  cron.schedule('*/30 * * * *', async () => {
    try {
      await sendReminders(24, '24 ساعة')
      await sendReminders(1, 'ساعة واحدة')
      await sendReminders(0.25, '15 دقيقة')
    } catch (err) {
      console.error('[CRON] Session reminder error:', err.message)
    }
  }, { timezone: 'Asia/Riyadh' })

  console.log('[CRON] Session reminder job started')
}

module.exports = { startSessionReminderJob }

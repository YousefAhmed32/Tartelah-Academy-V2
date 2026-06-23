const cron = require('node-cron')
const Session = require('../models/Session')
const Notification = require('../models/Notification')
const User = require('../models/User')
const { sendSessionReminderEmail } = require('../services/email.service')

// Track sent reminders to avoid duplicates
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

    // In-app notification for student
    await Notification.create({
      userId: student._id,
      titleAr: `تذكير: حصة بعد ${labelAr}`,
      bodyAr: `حصتك "${session.titleAr}" ستبدأ بعد ${labelAr}`,
      type: 'reminder',
      data: { sessionId: session._id },
    })

    // In-app notification for teacher
    await Notification.create({
      userId: teacher._id,
      titleAr: `تذكير: حصة بعد ${labelAr}`,
      bodyAr: `حصتك مع الطالب ${student.firstNameAr} ستبدأ بعد ${labelAr}`,
      type: 'reminder',
      data: { sessionId: session._id },
    })

    // Email reminders
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
  // Run every 30 minutes
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

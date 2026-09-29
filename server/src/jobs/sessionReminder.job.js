const cron = require('node-cron')
const Session = require('../models/Session')
const Assignment = require('../models/SupervisionAssignment')
const Shift = require('../models/SupervisionShift')
const User = require('../models/User')
const { createNotification } = require('../services/notification.service')
const { sendSessionReminderEmail } = require('../services/email.service')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

const MINUTE = 60000
// The nearest reminder is processed first when the queue is busy.
const OFFSETS = [5, 15, 30, 60, 1440]
const id = (value) => String(value?._id || value || '')
const resumeAfter = new Map()

// A short catch-up window covers restarts without describing a late reminder
// as though it arrived at the exact offset.
function reminderWindows(now) {
  return OFFSETS.map((minutes) => ({
    minutes,
    from: new Date(now.getTime() + minutes * MINUTE - 2 * MINUTE),
    to: new Date(now.getTime() + minutes * MINUTE + 15 * 1000),
  }))
}

async function recipientsFor(sessions, from, to) {
  const teacherIds = [...new Set(sessions.map((session) => id(session.teacherId)).filter(Boolean))]
  const assignments = teacherIds.length ? await Assignment.find({ teacherId: { $in: teacherIds }, startsAt: { $lt: to }, $or: [{ endsAt: null }, { endsAt: { $gt: from } }] }).select('team teacherId supervisorId startsAt endsAt').lean() : []
  const supervisors = [...new Set(assignments.map((row) => id(row.supervisorId)))]
  const shifts = supervisors.length ? await Shift.find({ members: { $in: supervisors }, cancelledAt: null, startsAt: { $lt: to }, endsAt: { $gt: from } }).select('team members startsAt endsAt').lean() : []
  const users = supervisors.length ? await User.find({ _id: { $in: supervisors }, isActive: true, supervisionPosition: 'supervisor' }).select('_id supervisionTeam supervisionPosition').lean() : []
  const activeSupervisorIds = new Set(users.map((user) => id(user)))
  return (session) => {
    const at = session.scheduledAt
    const active = assignments.filter((row) => id(row.teacherId) === id(session.teacherId) && row.startsAt <= at && (!row.endsAt || row.endsAt > at))
    const supervisorIds = active.filter((row) => activeSupervisorIds.has(id(row.supervisorId)) && shifts.some((shift) => shift.team === row.team && shift.startsAt <= at && shift.endsAt > at && shift.members.some((member) => id(member) === id(row.supervisorId)))).map((row) => id(row.supervisorId))
    const recipients = users.filter((user) => supervisorIds.includes(id(user)))
    return recipients.map((user) => ({
      userId: user._id,
      actionUrl: `/admin/supervision/${user.supervisionTeam}${user.supervisionPosition === 'manager' ? '-manager' : ''}`,
    }))
  }
}

async function sendReminder(session, minutes, extraRecipients) {
  const stillCurrent = async () => !!await Session.exists({ _id: session._id, status: 'scheduled', scheduledAt: session.scheduledAt })
  const stamp = new Date(session.scheduledAt).getTime()
  const label = new Date(session.scheduledAt).toLocaleString('ar-EG', { timeZone: DEFAULT_ACADEMY_TIMEZONE, dateStyle: 'short', timeStyle: 'short' })
  const participants = [
    { userId: session.studentId?._id, actionUrl: '/student/sessions', bodyAr: `حصتك ${session.titleAr} موعدها ${label}` },
    { userId: session.teacherId?._id, actionUrl: '/teacher/sessions', bodyAr: `حصتك ${session.titleAr} موعدها ${label}` },
    ...([5, 30].includes(minutes) ? extraRecipients : []).map((recipient) => ({ ...recipient, bodyAr: `الحصة ${session.titleAr} المكلف بمتابعتها موعدها ${label}` })),
  ]
  for (const target of participants) {
    if (!target.userId || !await stillCurrent()) break
    const reminderKey = `session:${session._id}:${stamp}:${minutes}:${id(target.userId)}`
    const created = await createNotification({
      userId: target.userId, type: 'session', titleAr: minutes === 5 ? 'الحصة قريبة' : 'تذكير بموعد الحصة', bodyAr: target.bodyAr,
      priority: minutes <= 5 ? 'urgent' : minutes <= 60 ? 'high' : 'medium', relatedId: session._id,
      actionUrl: target.actionUrl, metadata: { reminderKey, scheduledAt: session.scheduledAt, offsetMinutes: minutes },
    })
    if (created && minutes === 1440 && id(target.userId) === id(session.studentId) && await stillCurrent()) {
      try { await sendSessionReminderEmail({ to: session.studentId.email, name: session.studentId.firstNameAr, sessionTitle: session.titleAr, scheduledAt: session.scheduledAt, meetingLink: session.meetingLink }) }
      catch (error) { console.error('[CRON] Session reminder email error:', error) }
    }
  }
}

async function runSessionReminders(now = new Date()) {
  const windows = reminderWindows(now)
  for (const window of windows) {
    let cursor = resumeAfter.get(window.minutes) || null
    let processed = 0
    do {
      const query = { status: 'scheduled', scheduledAt: { $gte: window.from, $lte: window.to } }
      if (cursor) query._id = { $gt: cursor }
      const sessions = await Session.find(query).sort({ _id: 1 }).limit(100).populate('studentId teacherId', 'firstNameAr lastNameAr email').lean()
      if (!sessions.length) { resumeAfter.delete(window.minutes); break }
      const recipients = await recipientsFor(sessions, window.from, window.to)
      for (const session of sessions) {
        if (session.studentId && session.teacherId) await sendReminder(session, window.minutes, recipients(session))
      }
      cursor = sessions[sessions.length - 1]._id
      processed += sessions.length
      if (sessions.length < 100) { resumeAfter.delete(window.minutes); break }
    } while (processed < 1000)
    if (processed >= 1000) {
      resumeAfter.set(window.minutes, cursor)
      console.warn(`[CRON] Session reminder batch limit reached for ${window.minutes}m; next tick will continue`)
    }
  }
}

function startSessionReminderJob() {
  let running = false
  cron.schedule('*/15 * * * * *', async () => {
    if (running) return
    running = true
    try { await runSessionReminders() } catch (error) { console.error('[CRON] Session reminder error:', error) }
    finally { running = false }
  }, { timezone: DEFAULT_ACADEMY_TIMEZONE })
  console.log('[CRON] Session reminder job started (15s cadence)')
}

module.exports = { startSessionReminderJob, runSessionReminders, reminderWindows }

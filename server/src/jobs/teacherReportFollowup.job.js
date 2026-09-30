const cron = require('node-cron')
const Session = require('../models/Session')
const Assignment = require('../models/SupervisionAssignment')
const coverage = require('../services/supervisionCoverage.service')
const QuranSessionReport = require('../models/QuranSessionReport')
const User = require('../models/User')
const { createNotification } = require('../services/notification.service')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

const id = (value) => String(value?._id || value || '')
let resumeAfter = null

async function sweepMissingReports(from, cutoff, initialCursor, maxBatches) {
  let cursor = initialCursor
  for (let batch = 0; batch < maxBatches; batch++) {
    const filter = { status: 'completed', quranReportRequired: { $ne: false }, completedAt: { $gte: from, $lte: cutoff } }
    if (cursor) filter._id = { $gt: cursor }
    const sessions = await Session.find(filter).sort({ _id: 1 }).limit(100).select('_id teacherId studentId supervisionOriginalTeacherId scheduledAt completedAt titleAr').lean()
    if (!sessions.length) return null
    const sessionIds = sessions.map((row) => row._id)
    const reports = await QuranSessionReport.find({ sessionId: { $in: sessionIds }, status: { $in: ['submitted', 'approved'] } }).select('sessionId').lean()
    const reported = new Set(reports.map((row) => id(row.sessionId)))
    const missing = sessions.filter((row) => !reported.has(id(row)))
    if (missing.length) {
      const teacherIds = [...new Set(missing.map((row) => id(row.teacherId)))]
      const earliest = new Date(Math.min(...missing.map((row) => row.scheduledAt.getTime())))
      const latest = new Date(Math.max(...missing.map((row) => row.scheduledAt.getTime())) + 1)
      const complex = await Assignment.exists({ team: 'academic', scopeType: { $in: ['student', 'cohort'] }, startsAt: { $lt: latest }, $or: [{ endsAt: null }, { endsAt: { $gt: earliest } }] })
      const scoped = complex ? await coverage.loadCoverage('academic', missing) : null
      const assignments = scoped ? scoped.assignments : await Assignment.find({ team: 'academic', teacherId: { $in: teacherIds }, startsAt: { $lt: latest }, $or: [{ endsAt: null }, { endsAt: { $gt: earliest } }] }).select('teacherId supervisorId startsAt endsAt').lean()
      const supervisors = [...new Set((scoped?.assignments || assignments).map((row) => id(row.supervisorId)))]
      const activeUsers = await User.find({ isActive: true, $or: [{ _id: { $in: supervisors }, supervisionTeam: 'academic', supervisionPosition: 'supervisor' }, { supervisionTeam: 'academic', supervisionPosition: 'manager' }] }).select('_id supervisionPosition').lean()
      const activeIds = new Set(activeUsers.map((user) => id(user)))
      const managerIds = activeUsers.filter((user) => user.supervisionPosition === 'manager').map((user) => user._id)
      for (const session of missing) {
        const current = await Session.exists({ _id: session._id, status: 'completed', quranReportRequired: { $ne: false } })
        const report = await QuranSessionReport.exists({ sessionId: session._id, status: { $in: ['submitted', 'approved'] } })
        if (!current || report) continue
        const assigned = scoped ? [coverage.resolveOwner(session, scoped.assignments, scoped.memberships)?.supervisorId].filter((owner) => owner && activeIds.has(id(owner)))
          : assignments.filter((row) => id(row.teacherId) === id(session.teacherId) && row.startsAt <= session.scheduledAt && (!row.endsAt || row.endsAt > session.scheduledAt) && activeIds.has(id(row.supervisorId))).map((row) => row.supervisorId)
        const recipients = [
          { userId: session.teacherId, url: `/teacher/quran-reports/${session._id}`, title: 'تقرير حصتك لم يُرسل بعد' },
          ...[...new Set(assigned.map(id))].map((userId) => ({ userId, url: '/admin/supervision/academic', title: 'تقرير معلم يحتاج متابعة' })),
          ...managerIds.map((userId) => ({ userId, url: '/admin/supervision/academic-manager', title: 'تقرير معلم يحتاج متابعة' })),
        ]
        for (const recipient of recipients) {
          await createNotification({ userId: recipient.userId, type: 'report', titleAr: recipient.title,
            bodyAr: `انتهت حصة ${session.titleAr} ولم يصل تقرير المعلم بعد.`, actionUrl: recipient.url, relatedId: session._id,
            metadata: { reminderKey: `missing-teacher-report:${session._id}:${id(recipient.userId)}` },
          })
        }
      }
    }
    cursor = sessions[sessions.length - 1]._id
    if (sessions.length < 100) return null
  }
  return cursor
}

async function runMissingTeacherReportAlerts(now = new Date()) {
  const cutoff = new Date(now.getTime() - 10 * 60000)
  const recentFrom = new Date(now.getTime() - 30 * 60000)
  // Prioritize fresh missing reports; a 48-hour catch-up rotates separately
  // so a large historical backlog cannot delay today's ten-minute alert.
  await sweepMissingReports(recentFrom, cutoff, null, 10)
  resumeAfter = await sweepMissingReports(new Date(now.getTime() - 48 * 3600000), recentFrom, resumeAfter, 10)
  if (resumeAfter) console.warn('[CRON] Missing teacher report catch-up continues next run')
}

function startTeacherReportFollowupJob() {
  let running = false
  cron.schedule('*/5 * * * *', async () => {
    if (running) return
    running = true
    try { await runMissingTeacherReportAlerts() } catch (error) { console.error('[CRON] Teacher report follow-up error:', error) }
    finally { running = false }
  }, { timezone: DEFAULT_ACADEMY_TIMEZONE })
}

module.exports = { startTeacherReportFollowupJob, runMissingTeacherReportAlerts }

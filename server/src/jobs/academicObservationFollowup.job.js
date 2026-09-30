const cron = require('node-cron')
const Session = require('../models/Session')
const Assignment = require('../models/SupervisionAssignment')
const coverage = require('../services/supervisionCoverage.service')
const Shift = require('../models/SupervisionShift')
const Report = require('../models/AcademicObservationReport')
const Settings = require('../models/SupervisionSettings')
const User = require('../models/User')
const { createNotification } = require('../services/notification.service')
const { notifySubmitted, ensureFollowUpAction } = require('../controllers/academicObservation.controller')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

const id = (value) => String(value?._id || value || '')
let resumeAfter = null

async function runMissingAcademicReports(now = new Date()) {
  const from = new Date(now.getTime() - 48 * 3600000)
  const settings = await Settings.findOne({ team: 'academic' }).select('reportGraceMinutes').lean()
  const grace = settings?.reportGraceMinutes ?? 120
  const [managers, admins] = await Promise.all([
    User.find({ isActive: true, supervisionTeam: 'academic', supervisionPosition: 'manager' }).select('_id').lean(),
    User.find({ isActive: true, isPrimaryAdmin: true }).select('_id').lean(),
  ])
  const leaderIds = [...new Set([...managers, ...admins].map(id))]
  let cursor = resumeAfter
  for (let batch = 0; batch < 10; batch++) {
    const filter = { status: { $in: ['completed', 'missed', 'no_show'] }, quranReportRequired: { $ne: false },
      scheduledAt: { $gte: from, $lt: now } }
    if (cursor) filter._id = { $gt: cursor }
    const sessions = await Session.find(filter).sort({ _id: 1 }).limit(100)
      .select('_id teacherId studentId supervisionOriginalTeacherId scheduledAt titleAr').lean()
    if (!sessions.length) { resumeAfter = null; break }
    const teachers = [...new Set(sessions.flatMap((row) => [id(row.teacherId), id(row.supervisionOriginalTeacherId)].filter(Boolean)))]
    const complex = await Assignment.exists({ team: 'academic', scopeType: { $in: ['student', 'cohort'] }, startsAt: { $lt: now }, $or: [{ endsAt: null }, { endsAt: { $gt: from } }] })
    const scoped = complex ? await coverage.loadCoverage('academic', sessions) : null
    const [assignments, shifts, reports] = await Promise.all([
      scoped ? scoped.assignments : Assignment.find({ team: 'academic', teacherId: { $in: teachers }, startsAt: { $lt: now },
        $or: [{ endsAt: null }, { endsAt: { $gt: from } }] }).select('teacherId supervisorId startsAt endsAt').lean(),
      Shift.find({ team: 'academic', cancelledAt: null, startsAt: { $lt: now }, endsAt: { $gt: from } })
        .select('members startsAt endsAt').lean(),
      Report.find({ sessionId: { $in: sessions.map((row) => row._id) } }).select('sessionId supervisorId status').lean(),
    ])
    const activeSupervisors = await User.find({ _id: { $in: [...new Set(assignments.map((row) => id(row.supervisorId)))] },
      isActive: true, supervisionTeam: 'academic', supervisionPosition: 'supervisor' }).select('_id').lean()
    const active = new Set(activeSupervisors.map(id))
    const reportByPair = new Map(reports.map((row) => [`${id(row.sessionId)}:${id(row.supervisorId)}`, row]))
    for (const session of sessions) {
      const owners = (scoped ? [id(coverage.resolveOwner(session, scoped.assignments, scoped.memberships)?.supervisorId)].filter(Boolean)
        : [...new Set(assignments.filter((row) => [id(session.teacherId), id(session.supervisionOriginalTeacherId)].includes(id(row.teacherId))
          && row.startsAt <= session.scheduledAt && (!row.endsAt || row.endsAt > session.scheduledAt))
          .map((row) => id(row.supervisorId)))]).filter((ownerId) => active.has(ownerId))
      for (const ownerId of owners) {
        const shift = shifts.filter((row) => row.members.some((member) => id(member) === ownerId)
          && row.startsAt <= session.scheduledAt && row.endsAt > session.scheduledAt).sort((a, b) => a.endsAt - b.endsAt)[0]
        if (!shift || now <= new Date(shift.endsAt.getTime() + grace * 60000)) continue
        const existing = reportByPair.get(`${id(session)}:${ownerId}`)
        if (existing && ['submitted', 'reviewed'].includes(existing.status)) continue
        const recipients = [...new Set([ownerId, ...leaderIds])]
        for (const userId of recipients) await createNotification({ userId, type: 'report', priority: 'high',
          titleAr: userId === ownerId ? 'تقرير متابعة حصتك متأخر' : 'تقرير متابعة أكاديمية ناقص',
          bodyAr: `لم يُرسل تقرير متابعة حصة ${session.titleAr} قبل انتهاء المهلة. المشرف المسؤول مسجل في تكليف الحصة.`,
          actionUrl: userId === ownerId ? '/admin/supervision/academic' : '/admin/supervision/academic-manager',
          relatedId: session._id, metadata: { reminderKey: `academic-report-missing:${session._id}:${ownerId}` },
        })
      }
    }
    cursor = sessions[sessions.length - 1]._id
    if (sessions.length < 100) { resumeAfter = null; break }
    resumeAfter = cursor
  }
  // Retry the one-time dispatch for submitted reports after a restart or a transient notification failure.
  const submitted = await Report.find({ submittedAt: { $gte: from, $lt: now }, status: { $in: ['submitted', 'reviewed'] } })
    .sort({ submittedAt: -1 }).limit(200).select('_id sessionId supervisorId teacherId studentId scheduledAt teacherGuidance publishedTeacherGuidance teacherGuidanceVersion submissionVersion nextFollowUpPoint nextSessionId followUpNeeded').lean()
  for (const row of submitted) {
    await ensureFollowUpAction(row)
    await notifySubmitted(row, !!row.publishedTeacherGuidance)
  }
}

function startAcademicObservationFollowupJob() {
  let running = false
  cron.schedule('*/5 * * * *', async () => {
    if (running) return
    running = true
    try { await runMissingAcademicReports() } catch (error) { console.error('[CRON] Academic report follow-up:', error) }
    finally { running = false }
  }, { timezone: DEFAULT_ACADEMY_TIMEZONE })
}

module.exports = { startAcademicObservationFollowupJob, runMissingAcademicReports }

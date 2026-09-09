// Missing Quran-report tracking + monthly follow-up (Phase 2 §11). Bounded,
// indexed queries only — every function here takes an explicit date range
// (never an unbounded "all time" scan) and reads through Session's existing
// {teacherId,status} / {scheduledAt} indexes plus QuranSessionReport's own
// {sessionId} unique index (a $lookup-free "does a report exist" check via
// an in-memory Set, since a day/week's session count is always small).
const mongoose = require('mongoose')
const { toZonedTime } = require('date-fns-tz')
const Session = require('../models/Session')
const QuranSessionReport = require('../models/QuranSessionReport')
const User = require('../models/User')
const { getAcademyTimezone } = require('./academySettings.service')

function toObjectId(id) { return new mongoose.Types.ObjectId(id) }

/** Academy-timezone day boundaries for "today" (or a given date). */
async function dayBoundsInAcademyTz(date = new Date()) {
  const timezone = await getAcademyTimezone()
  const zoned = toZonedTime(date, timezone)
  const start = new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end, timezone }
}

/** Which of these sessionIds already have a report at/past `submitted`. */
async function reportedSessionIdSet(sessionIds) {
  if (!sessionIds.length) return new Set()
  const rows = await QuranSessionReport.find({
    sessionId: { $in: sessionIds }, status: { $in: ['submitted', 'correction_requested', 'approved'] },
  }).select('sessionId')
  return new Set(rows.map((r) => String(r.sessionId)))
}

/**
 * Today's completed-session report progress for one teacher — powers the
 * dashboard alert + "X of Y submitted today" progress and the list of
 * exact sessions still missing a report (with a direct deep link target).
 */
async function getTeacherDailyProgress(teacherId, date = new Date()) {
  const { start, end } = await dayBoundsInAcademyTz(date)
  const sessions = await Session.find({ teacherId, status: 'completed', scheduledAt: { $gte: start, $lt: end } })
    .select('studentId scheduledAt').populate('studentId', 'firstNameAr lastNameAr avatar').sort({ scheduledAt: 1 })
  const reported = await reportedSessionIdSet(sessions.map((s) => s._id))
  const missing = sessions.filter((s) => !reported.has(String(s._id)))
  return {
    total: sessions.length, reportedCount: sessions.length - missing.length,
    allDone: sessions.length > 0 && missing.length === 0,
    missing: missing.map((s) => ({ sessionId: s._id, studentId: s.studentId?._id, studentName: `${s.studentId?.firstNameAr || ''} ${s.studentId?.lastNameAr || ''}`.trim(), scheduledAt: s.scheduledAt })),
  }
}

/** Every completed session older than `minAgeHours` still missing a report — bounded to the last 60 days. */
async function getTeacherOverdueReports(teacherId, { minAgeHours = 24 } = {}) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - minAgeHours * 60 * 60 * 1000)
  const windowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) // bounded lookback
  const sessions = await Session.find({ teacherId, status: 'completed', scheduledAt: { $gte: windowStart, $lte: cutoff } })
    .select('studentId scheduledAt').populate('studentId', 'firstNameAr lastNameAr avatar').sort({ scheduledAt: -1 })
  const reported = await reportedSessionIdSet(sessions.map((s) => s._id))
  return sessions.filter((s) => !reported.has(String(s._id)))
    .map((s) => ({ sessionId: s._id, studentId: s.studentId?._id, studentName: `${s.studentId?.firstNameAr || ''} ${s.studentId?.lastNameAr || ''}`.trim(), scheduledAt: s.scheduledAt, ageHours: Math.round((now - s.scheduledAt) / 3600000) }))
}

/**
 * Admin-side overview for a bounded date range — session-outcome counts
 * (scheduled/conducted/attendance-completed/report-completed/missing-
 * report/cancelled/postponed) plus, optionally, one row per teacher with
 * overdue counts (for the "teachers with overdue reports" table).
 */
async function getAdminReportOverview({ from, to, teacherId, studentId } = {}) {
  const match = {}
  if (from || to) match.scheduledAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) }
  if (teacherId) match.teacherId = toObjectId(teacherId)
  if (studentId) match.studentId = toObjectId(studentId)

  const rows = await Session.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]))
  const scheduled = Object.values(counts).reduce((a, b) => a + b, 0)
  const conducted = (counts.completed || 0) + (counts.no_show || 0)
  const attendanceCompleted = counts.completed || 0 // teacherAttendanceStatus is only meaningfully resolved on 'completed'/'no_show'; completed = the attendance-relevant bucket for reporting purposes

  const completedSessions = await Session.find({ ...match, status: 'completed' }).select('_id')
  const reported = await reportedSessionIdSet(completedSessions.map((s) => s._id))

  return {
    scheduled, conducted, attendanceCompleted,
    reportCompleted: reported.size,
    missingReport: completedSessions.length - reported.size,
    cancelled: counts.cancelled || 0,
    postponed: counts.rescheduled || 0,
    noShow: counts.no_show || 0,
  }
}

/** One row per active teacher with an overdue-report count — the admin "teachers with overdue reports" table. Bounded to active teachers. */
async function getTeachersWithOverdueReports({ minAgeHours = 24 } = {}) {
  const teachers = await User.find({ role: 'teacher', isActive: true }).select('firstNameAr lastNameAr avatar')
  const rows = await Promise.all(teachers.map(async (t) => {
    const overdue = await getTeacherOverdueReports(t._id, { minAgeHours })
    return overdue.length ? { teacherId: t._id, teacherName: `${t.firstNameAr} ${t.lastNameAr}`, avatar: t.avatar, overdueCount: overdue.length, oldest: overdue[overdue.length - 1] } : null
  }))
  return rows.filter(Boolean).sort((a, b) => b.overdueCount - a.overdueCount)
}

/** "30 من 60"-style monthly completion ratio for one teacher (or org-wide when teacherId is omitted). */
async function getMonthlyCompletionRatio({ teacherId, year, month } = {}) {
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)
  const filter = { status: 'completed', scheduledAt: { $gte: from, $lte: to } }
  if (teacherId) filter.teacherId = toObjectId(teacherId)
  const completedSessions = await Session.find(filter).select('_id')
  const reported = await reportedSessionIdSet(completedSessions.map((s) => s._id))
  return { total: completedSessions.length, reported: reported.size, label: `${reported.size} من ${completedSessions.length}` }
}

module.exports = {
  getTeacherDailyProgress, getTeacherOverdueReports, getAdminReportOverview,
  getTeachersWithOverdueReports, getMonthlyCompletionRatio, dayBoundsInAcademyTz,
}

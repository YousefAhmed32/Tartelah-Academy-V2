const mongoose = require('mongoose')
const Session = require('../models/Session')
const User = require('../models/User')
const { buildSearchFilter } = require('../utils/pagination')

// Sessions where the teacher actually taught (used for salary + punctuality)
const RESOLVED_STATUSES = ['completed', 'no_show']
const PAYABLE_ATTENDANCE = ['on_time', 'late']
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id)
}

function dateRangeMatch(from, to) {
  if (!from && !to) return {}
  const range = {}
  if (from) range.$gte = new Date(from)
  if (to) range.$lte = new Date(to)
  return { scheduledAt: range }
}

/**
 * Attendance/completion breakdown for one teacher over an optional date range.
 * Computed live from Session records — no duplicated/stored stats to drift out of sync.
 */
async function getAttendanceSummary(teacherId, { from, to } = {}) {
  const match = {
    teacherId: toObjectId(teacherId),
    status: { $in: RESOLVED_STATUSES },
    ...dateRangeMatch(from, to),
  }

  const rows = await Session.aggregate([
    { $match: match },
    { $group: { _id: '$teacherAttendanceStatus', count: { $sum: 1 } } },
  ])

  const counts = { pending: 0, on_time: 0, late: 0, absent: 0, excused: 0 }
  rows.forEach(r => { if (r._id in counts) counts[r._id] = r.count })

  const totalSessions = Object.values(counts).reduce((a, b) => a + b, 0)
  const attended = counts.on_time + counts.late + counts.excused
  const punctualityRate = totalSessions ? Math.round((counts.on_time / totalSessions) * 100) : 0
  const completionRate = totalSessions ? Math.round((attended / totalSessions) * 100) : 0

  return { totalSessions, ...counts, completionRate, punctualityRate }
}

/**
 * Salary owed to a teacher for a period: (on_time + late sessions) × salaryPerSession.
 * Absent sessions are unpaid. Excused sessions don't generate pay (teacher didn't teach)
 * but aren't held against punctuality either.
 */
async function getSalaryBreakdown(teacherId, { from, to } = {}) {
  const teacher = await User.findById(teacherId).select('firstNameAr lastNameAr salaryPerSession')
  if (!teacher) return null
  const rate = teacher.salaryPerSession || 0
  const summary = await getAttendanceSummary(teacherId, { from, to })
  const payableSessions = summary.on_time + summary.late

  return {
    teacherId: teacher._id,
    teacherName: `${teacher.firstNameAr} ${teacher.lastNameAr}`,
    salaryPerSession: rate,
    payableSessions,
    unpaidAbsences: summary.absent,
    excusedSessions: summary.excused,
    totalAmount: payableSessions * rate,
    currency: 'SAR',
    summary,
  }
}

function startOfWeek(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - date.getDay())
  return date
}

async function getWeeklyTrend(teacherId, weeksBack = 8) {
  const teacher = await User.findById(teacherId).select('salaryPerSession')
  const rate = teacher?.salaryPerSession || 0
  const currentWeekStart = startOfWeek(new Date())
  const buckets = []

  for (let i = weeksBack - 1; i >= 0; i--) {
    const from = new Date(currentWeekStart)
    from.setDate(from.getDate() - i * 7)
    const to = new Date(from)
    to.setDate(to.getDate() + 6)
    to.setHours(23, 59, 59, 999)

    const summary = await getAttendanceSummary(teacherId, { from, to })
    const completed = summary.on_time + summary.late
    buckets.push({
      label: `${from.getDate()}/${from.getMonth() + 1}`,
      from, to,
      completed, onTime: summary.on_time, late: summary.late, absent: summary.absent,
      amount: completed * rate,
    })
  }
  return buckets
}

async function getMonthlyTrend(teacherId, monthsBack = 6) {
  const teacher = await User.findById(teacherId).select('salaryPerSession')
  const rate = teacher?.salaryPerSession || 0
  const now = new Date()
  const buckets = []

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const from = new Date(d.getFullYear(), d.getMonth(), 1)
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

    const summary = await getAttendanceSummary(teacherId, { from, to })
    const completed = summary.on_time + summary.late
    buckets.push({
      label: MONTHS_AR[d.getMonth()],
      year: d.getFullYear(),
      completed, onTime: summary.on_time, late: summary.late, absent: summary.absent,
      amount: completed * rate,
    })
  }
  return buckets
}

/** Paginated raw attendance history (individual session records) for one teacher. */
async function getTeacherAttendanceHistory(teacherId, { page = 1, limit = 20, from, to, status } = {}) {
  const filter = {
    teacherId: toObjectId(teacherId),
    status: { $in: RESOLVED_STATUSES },
    ...dateRangeMatch(from, to),
  }
  if (status) filter.teacherAttendanceStatus = status

  const skip = (page - 1) * limit
  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .sort({ scheduledAt: -1 }).skip(skip).limit(limit)
      .populate('studentId', 'firstNameAr lastNameAr avatar'),
    Session.countDocuments(filter),
  ])
  return { sessions, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

/** Org-wide performance table for the admin dashboard, one row per teacher. */
async function getOrgWidePerformance({ from, to, search, page = 1, limit = 20 } = {}) {
  const filter = { role: 'teacher' }
  if (search) Object.assign(filter, buildSearchFilter(search, ['firstNameAr', 'lastNameAr', 'email']))

  const total = await User.countDocuments(filter)
  const teachers = await User.find(filter)
    .select('firstNameAr lastNameAr avatar email salaryPerSession isActive')
    .sort({ firstNameAr: 1 })
    .skip((page - 1) * limit)
    .limit(limit)

  const rows = await Promise.all(teachers.map(async (t) => {
    const summary = await getAttendanceSummary(t._id, { from, to })
    const payableSessions = summary.on_time + summary.late
    return {
      _id: t._id,
      firstNameAr: t.firstNameAr,
      lastNameAr: t.lastNameAr,
      avatar: t.avatar,
      email: t.email,
      isActive: t.isActive,
      salaryPerSession: t.salaryPerSession || 0,
      ...summary,
      totalAmount: payableSessions * (t.salaryPerSession || 0),
    }
  }))

  return { rows, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

/** Full unpaginated payroll report across all active teachers, for export. */
async function getSalaryReport({ from, to } = {}) {
  const teachers = await User.find({ role: 'teacher', isActive: true })
    .select('firstNameAr lastNameAr salaryPerSession')
    .sort({ firstNameAr: 1 })

  const rows = await Promise.all(teachers.map(t => getSalaryBreakdown(t._id, { from, to })))
  const totalPayroll = rows.reduce((sum, r) => sum + (r?.totalAmount || 0), 0)

  return { rows: rows.filter(Boolean), totalPayroll, currency: 'SAR', generatedAt: new Date() }
}

/** Admin manual correction of a specific session's teacher-attendance status. */
async function correctAttendance(sessionId, { status, notes }) {
  const session = await Session.findById(sessionId)
  if (!session) return null
  if (status) session.teacherAttendanceStatus = status
  if (notes !== undefined) session.teacherAttendanceNotes = notes
  session.teacherAttendanceMarkedBy = 'admin'
  await session.save()
  return session
}

module.exports = {
  getAttendanceSummary,
  getSalaryBreakdown,
  getWeeklyTrend,
  getMonthlyTrend,
  getTeacherAttendanceHistory,
  getOrgWidePerformance,
  getSalaryReport,
  correctAttendance,
}

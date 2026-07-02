const svc = require('../services/teacherPerformance.service')
const { createNotification } = require('../services/notification.service')
const { sendSuccess, sendError } = require('../utils/response')

function rangeFromQuery(query) {
  return { from: query.from || undefined, to: query.to || undefined }
}

// ─── Self (teacher) ───────────────────────────────────────────────────────────

exports.getMySummary = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const [attendance, salary] = await Promise.all([
      svc.getAttendanceSummary(req.user._id, { from, to }),
      svc.getSalaryBreakdown(req.user._id, { from, to }),
    ])
    sendSuccess(res, { attendance, salary })
  } catch (err) { next(err) }
}

exports.getMyAttendanceHistory = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const result = await svc.getTeacherAttendanceHistory(req.user._id, {
      page: req.query.page, limit: req.query.limit, from, to, status: req.query.status,
    })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

exports.getMyTrend = async (req, res, next) => {
  try {
    const range = req.query.range === 'monthly' ? 'monthly' : 'weekly'
    const data = range === 'monthly'
      ? await svc.getMonthlyTrend(req.user._id, Number(req.query.periods) || 6)
      : await svc.getWeeklyTrend(req.user._id, Number(req.query.periods) || 8)
    sendSuccess(res, data)
  } catch (err) { next(err) }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getAdminAll = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const result = await svc.getOrgWidePerformance({
      from, to, search: req.query.search, page: req.query.page, limit: req.query.limit,
    })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

exports.getAdminTeacherSummary = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const [attendance, salary] = await Promise.all([
      svc.getAttendanceSummary(req.params.teacherId, { from, to }),
      svc.getSalaryBreakdown(req.params.teacherId, { from, to }),
    ])
    if (!salary) return sendError(res, 'المعلم غير موجود', 404)
    sendSuccess(res, { attendance, salary })
  } catch (err) { next(err) }
}

exports.getAdminTeacherAttendance = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const result = await svc.getTeacherAttendanceHistory(req.params.teacherId, {
      page: req.query.page, limit: req.query.limit, from, to, status: req.query.status,
    })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

exports.getAdminTeacherTrend = async (req, res, next) => {
  try {
    const range = req.query.range === 'monthly' ? 'monthly' : 'weekly'
    const data = range === 'monthly'
      ? await svc.getMonthlyTrend(req.params.teacherId, Number(req.query.periods) || 6)
      : await svc.getWeeklyTrend(req.params.teacherId, Number(req.query.periods) || 8)
    sendSuccess(res, data)
  } catch (err) { next(err) }
}

exports.getAdminSalaryReport = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const report = await svc.getSalaryReport({ from, to })
    sendSuccess(res, report)
  } catch (err) { next(err) }
}

const ATTENDANCE_STATUSES = ['pending', 'on_time', 'late', 'absent', 'excused']

exports.correctSessionAttendance = async (req, res, next) => {
  try {
    const { status, notes } = req.body
    if (status && !ATTENDANCE_STATUSES.includes(status)) return sendError(res, 'حالة حضور غير صالحة', 400)

    const session = await svc.correctAttendance(req.params.sessionId, { status, notes })
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    await createNotification({
      userId: session.teacherId,
      titleAr: 'تم تحديث سجل حضورك',
      bodyAr: `قام الإدارة بتحديث حالة حضورك لحصة "${session.titleAr}"${notes ? ` — ${notes}` : ''}`,
      type: 'attendance',
      priority: 'medium',
      relatedId: session._id,
    })

    sendSuccess(res, session, 'تم تحديث سجل الحضور')
  } catch (err) { next(err) }
}

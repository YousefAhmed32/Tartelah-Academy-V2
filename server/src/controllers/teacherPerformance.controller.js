const svc = require('../services/teacherPerformance.service')
const { createNotification } = require('../services/notification.service')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')

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

// Payroll-readiness (payable/non_payable/pending_review/excluded breakdown)
exports.getMyPayrollReadiness = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const data = await svc.getPayrollReadiness(req.user._id, { from, to })
    sendSuccess(res, data)
  } catch (err) { next(err) }
}

exports.getAdminPayrollReadiness = async (req, res, next) => {
  try {
    const { from, to } = rangeFromQuery(req.query)
    const rows = await svc.getOrgWidePayrollReadiness({ from, to })
    const totals = rows.reduce((acc, r) => {
      acc.payable += r.payable; acc.non_payable += r.non_payable
      acc.pending_review += r.pending_review; acc.excluded += r.excluded
      acc.pending += r.pending; acc.estimatedAmount += r.estimatedAmount
      return acc
    }, { payable: 0, non_payable: 0, pending_review: 0, excluded: 0, pending: 0, estimatedAmount: 0 })
    sendSuccess(res, { rows, totals })
  } catch (err) { next(err) }
}

const ATTENDANCE_STATUSES = ['pending', 'on_time', 'late', 'absent', 'excused']
const PAYROLL_STATUSES = ['pending', 'payable', 'non_payable', 'pending_review', 'excluded']

exports.correctSessionAttendance = async (req, res, next) => {
  try {
    const { status, notes, payrollStatus, payrollStatusReason } = req.body
    if (status && !ATTENDANCE_STATUSES.includes(status)) return sendError(res, 'حالة حضور غير صالحة', 400)
    if (payrollStatus && !PAYROLL_STATUSES.includes(payrollStatus)) return sendError(res, 'حالة راتب غير صالحة', 400)

    const session = await svc.correctAttendance(req.params.sessionId, { status, notes, payrollStatus, payrollStatusReason })
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'attendance.admin_correction',
      entity: 'Session', entityId: session._id,
      changes: { status, notes, payrollStatus, payrollStatusReason }, ip: req.ip,
    })

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

const MonthlyTeacherReport = require('../models/MonthlyTeacherReport')
const User = require('../models/User')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createNotification, createNotifications } = require('../services/notification.service')
const svc = require('../services/monthlyReport.service')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
  next(err)
}

// ── Teacher self-service ─────────────────────────────────────────────────────

exports.getMyReports = async (req, res, next) => {
  try { sendSuccess(res, await svc.listForTeacher(req.user._id, { page: req.query.page, limit: req.query.limit })) }
  catch (err) { handleKnownError(err, res, next) }
}

exports.getMyReport = async (req, res, next) => {
  try {
    const report = await MonthlyTeacherReport.findOne({ _id: req.params.id, teacherId: req.user._id })
    if (!report) return sendError(res, 'التقرير غير موجود', 404)
    sendSuccess(res, report)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.submitMyReport = async (req, res, next) => {
  try {
    const report = await svc.submitReport(req.params.id, { teacherId: req.user._id, fields: req.body })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'monthlyReport.submit', entity: 'MonthlyTeacherReport', entityId: report._id, changes: { status: 'submitted', periodKey: report.periodKey }, ip: req.ip })
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    await createNotifications(admins.map((a) => ({
      userId: a._id, titleAr: 'تقرير شهري جديد', bodyAr: `أرسل معلم تقريره الشهري لـ ${report.periodKey}`,
      type: 'report', relatedId: report._id, actionUrl: '/admin/monthly-reports',
    }))).catch(() => {})
    sendSuccess(res, report, 'تم إرسال التقرير الشهري')
  } catch (err) { handleKnownError(err, res, next) }
}

// ── Admin ────────────────────────────────────────────────────────────────────

exports.getAllReports = async (req, res, next) => {
  try {
    sendSuccess(res, await svc.listForAdmin({
      status: req.query.status, periodKey: req.query.periodKey, teacherId: req.query.teacherId,
      page: req.query.page, limit: req.query.limit,
    }))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getReport = async (req, res, next) => {
  try {
    const report = await MonthlyTeacherReport.findById(req.params.id).populate('teacherId', 'firstNameAr lastNameAr avatar email').populate('reviewedBy', 'firstNameAr lastNameAr')
    if (!report) return sendError(res, 'التقرير غير موجود', 404)
    sendSuccess(res, report)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.generateOne = async (req, res, next) => {
  try {
    const { teacherId, year, month } = req.body
    const report = await svc.generateReport(teacherId, Number(year), Number(month), { actorId: req.user._id })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'monthlyReport.generate', entity: 'MonthlyTeacherReport', entityId: report._id, ip: req.ip })
    sendSuccess(res, report, 'تم توليد التقرير')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.generateAll = async (req, res, next) => {
  try {
    const { year, month } = req.body
    const result = await svc.generateAllForMonth(Number(year), Number(month), { actorId: req.user._id })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'monthlyReport.generate_all', entity: 'MonthlyTeacherReport', changes: { year, month, ...result }, ip: req.ip })
    sendSuccess(res, result, 'تم توليد التقارير الشهرية')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.requestCompletion = async (req, res, next) => {
  try {
    const report = await svc.requestCompletion(req.params.id, { adminId: req.user._id, note: req.body.note })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'monthlyReport.request_completion', entity: 'MonthlyTeacherReport', entityId: report._id, changes: { status: 'needs_completion', note: req.body.note, periodKey: report.periodKey }, ip: req.ip })
    await createNotification({
      userId: report.teacherId, titleAr: 'مطلوب إكمال التقرير الشهري', bodyAr: req.body.note,
      type: 'report', priority: 'high', relatedId: report._id, actionUrl: '/teacher/monthly-reports',
    }).catch(() => {})
    sendSuccess(res, report, 'تم طلب إكمال التقرير')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.markReviewed = async (req, res, next) => {
  try {
    const report = await svc.markReviewed(req.params.id, { adminId: req.user._id, note: req.body.note })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'monthlyReport.reviewed', entity: 'MonthlyTeacherReport', entityId: report._id, changes: { status: 'reviewed', note: req.body.note || 'تمت مراجعة التقرير الشهري', periodKey: report.periodKey }, ip: req.ip })
    sendSuccess(res, report, 'تم تعليم التقرير كمُراجَع')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.approveReport = async (req, res, next) => {
  try {
    const report = await svc.approveReport(req.params.id, { adminId: req.user._id })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'monthlyReport.approve', entity: 'MonthlyTeacherReport', entityId: report._id, changes: { status: 'approved', periodKey: report.periodKey }, ip: req.ip })
    sendSuccess(res, report, 'تم اعتماد التقرير الشهري')
  } catch (err) { handleKnownError(err, res, next) }
}

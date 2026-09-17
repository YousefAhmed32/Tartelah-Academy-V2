// Quran session report + missing-report tracking (Phase 2 §10–§11). Business
// logic lives in services/quranReport.service.js and
// services/reportTracking.service.js — this file is request validation,
// authorization narrowing, and response shaping only.
const QuranSessionReport = require('../models/QuranSessionReport')
const Session = require('../models/Session')
const { sendSuccess, sendError } = require('../utils/response')
const { getPagination } = require('../utils/pagination')
const { logAction } = require('../services/audit.service')
const { createNotification, createNotifications } = require('../services/notification.service')
const reportService = require('../services/quranReport.service')
const trackingService = require('../services/reportTracking.service')
const User = require('../models/User')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
  next(err)
}

// ── Teacher ──────────────────────────────────────────────────────────────────

exports.saveDraft = async (req, res, next) => {
  try {
    const report = await reportService.saveDraft(req.params.sessionId, { teacherId: req.user._id, fields: req.body })
    sendSuccess(res, report, 'تم حفظ المسودة')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.submitReport = async (req, res, next) => {
  try {
    const { memorization, revision, ...fields } = req.body
    const report = await reportService.submitReport(req.params.sessionId, { teacherId: req.user._id, fields, memorization, revision })
    if (!report.$locals?.idempotentReplay) {
      logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'quranReport.submit', entity: 'QuranSessionReport', entityId: report._id, ip: req.ip })

      const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
      await createNotifications(admins.map((a) => ({
        userId: a._id, titleAr: 'تقرير حصة جديد', bodyAr: 'أرسل معلم تقرير حصة قرآنية جديد',
        type: 'report', relatedId: report._id, actionUrl: '/admin/quran-reports',
      }))).catch(() => {})
    }

    sendSuccess(res, report, 'تم إرسال التقرير')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getMyDailyProgress = async (req, res, next) => {
  try {
    sendSuccess(res, await trackingService.getTeacherDailyProgress(req.user._id, req.query.date ? new Date(req.query.date) : new Date()))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getMyOverdue = async (req, res, next) => {
  try {
    sendSuccess(res, await trackingService.getTeacherOverdueReports(req.user._id, { minAgeHours: Number(req.query.minAgeHours) || 24 }))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getMyReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = { teacherId: req.user._id }
    if (req.query.status) filter.status = req.query.status
    const [reports, total] = await Promise.all([
      QuranSessionReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('studentId', 'firstNameAr lastNameAr avatar').populate('sessionId', 'scheduledAt'),
      QuranSessionReport.countDocuments(filter),
    ])
    sendSuccess(res, { reports, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) { handleKnownError(err, res, next) }
}

// ── Shared detail (teacher-owner, admin, or the student it's about — approved/submitted only for the student) ──

exports.getSessionReport = async (req, res, next) => {
  try {
    const detail = await reportService.getSessionReportDetail(req.params.sessionId)
    if (!detail?.report) return sendError(res, 'لا يوجد تقرير لهذه الحصة بعد', 404)
    const { report } = detail
    const isOwnerTeacher = req.user.role === 'teacher' && String(report.teacherId._id || report.teacherId) === String(req.user._id)
    const isOwnerStudent = req.user.role === 'student' && String(report.studentId._id || report.studentId) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwnerTeacher && !isAdmin && !isOwnerStudent) return sendError(res, 'غير مصرح', 403)
    if (isOwnerStudent && !['submitted', 'approved'].includes(report.status)) return sendError(res, 'التقرير غير متاح بعد', 404)
    sendSuccess(res, detail)
  } catch (err) { handleKnownError(err, res, next) }
}

// ── Student ──────────────────────────────────────────────────────────────────

exports.getMyStudentReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = { studentId: req.user._id, status: { $in: ['submitted', 'approved'] } }
    const [reports, total] = await Promise.all([
      QuranSessionReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('teacherId', 'firstNameAr lastNameAr avatar').populate('sessionId', 'scheduledAt'),
      QuranSessionReport.countDocuments(filter),
    ])
    sendSuccess(res, { reports, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) { handleKnownError(err, res, next) }
}

// ── Admin ────────────────────────────────────────────────────────────────────

exports.getAllReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.teacherId) filter.teacherId = req.query.teacherId
    if (req.query.studentId) filter.studentId = req.query.studentId
    const [reports, total] = await Promise.all([
      QuranSessionReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('studentId', 'firstNameAr lastNameAr avatar').populate('teacherId', 'firstNameAr lastNameAr avatar')
        .populate('sessionId', 'scheduledAt'),
      QuranSessionReport.countDocuments(filter),
    ])
    sendSuccess(res, { reports, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) { handleKnownError(err, res, next) }
}

exports.requestCorrection = async (req, res, next) => {
  try {
    const report = await reportService.requestCorrection(req.params.id, { adminId: req.user._id, reason: req.body.reason })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'quranReport.request_correction', entity: 'QuranSessionReport', entityId: report._id, changes: { reason: req.body.reason }, ip: req.ip })
    await createNotification({
      userId: report.teacherId, titleAr: 'مطلوب تصحيح تقرير حصة',
      bodyAr: req.body.reason, type: 'report', priority: 'high',
      relatedId: report._id, actionUrl: `/teacher/quran-reports/${report.sessionId}`,
    }).catch(() => {})
    sendSuccess(res, report, 'تم طلب التصحيح')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.approveReport = async (req, res, next) => {
  try {
    const report = await reportService.approveReport(req.params.id, { adminId: req.user._id })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'quranReport.approve', entity: 'QuranSessionReport', entityId: report._id, ip: req.ip })
    await createNotification({
      userId: report.studentId, titleAr: 'تقرير حصة جديد', bodyAr: 'تمت إضافة تقرير جديد لحصتك',
      type: 'report', relatedId: report._id, actionUrl: '/student/quran-reports',
    }).catch(() => {})
    sendSuccess(res, report, 'تم اعتماد التقرير')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getOverview = async (req, res, next) => {
  try {
    sendSuccess(res, await trackingService.getAdminReportOverview({
      from: req.query.from, to: req.query.to, teacherId: req.query.teacherId, studentId: req.query.studentId,
    }))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getOverdueTeachers = async (req, res, next) => {
  try {
    sendSuccess(res, await trackingService.getTeachersWithOverdueReports({ minAgeHours: Number(req.query.minAgeHours) || 24 }))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getMonthlyRatio = async (req, res, next) => {
  try {
    const now = new Date()
    sendSuccess(res, await trackingService.getMonthlyCompletionRatio({
      teacherId: req.query.teacherId, year: Number(req.query.year) || now.getFullYear(), month: Number(req.query.month) || (now.getMonth() + 1),
    }))
  } catch (err) { handleKnownError(err, res, next) }
}

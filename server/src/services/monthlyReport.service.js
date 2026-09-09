// Monthly teacher report (Phase 2 §12) — generation (snapshot), lifecycle,
// and listing. Reuses every existing subsystem rather than recomputing its
// own version: attendance from teacherPerformance.service.js, financial
// totals from payrollPeriod.service.js, Quran-report completion from
// reportTracking.service.js. This file's only real job is to snapshot all
// three into one persisted document per teacher per month.
const mongoose = require('mongoose')
const Session = require('../models/Session')
const Subscription = require('../models/Subscription')
const MonthlyTeacherReport = require('../models/MonthlyTeacherReport')
const User = require('../models/User')
const teacherPerformance = require('./teacherPerformance.service')
const payrollPeriod = require('./payrollPeriod.service')
const reportTracking = require('./reportTracking.service')
const { createNotification } = require('./notification.service')
const { buildPeriodKey } = require('../config/payrollPeriod')

class MonthlyReportError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

function toObjectId(id) { return new mongoose.Types.ObjectId(id) }

/**
 * Takes a fresh snapshot for one teacher+month and writes it into the (get-
 * or-created) report document. Safe to call again later as an explicit
 * "regenerate" — an already-approved report is left untouched unless the
 * caller has explicitly reopened it first (see requestCompletion below,
 * which is the only path back to an editable state after submission).
 */
async function generateReport(teacherId, year, month, { actorId, isSystem = false } = {}) {
  const periodKey = buildPeriodKey(year, month)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)

  let report = await MonthlyTeacherReport.findOne({ teacherId, periodKey })
  if (report && ['submitted', 'needs_completion', 'reviewed', 'approved'].includes(report.status)) {
    throw new MonthlyReportError('لا يمكن إعادة توليد تقرير بعد إرساله — أعد فتحه أولًا', 409)
  }

  const [sessionRows, attendanceSummary, assignedCount, missingRatio] = await Promise.all([
    Session.aggregate([
      { $match: { teacherId: toObjectId(teacherId), scheduledAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    teacherPerformance.getAttendanceSummary(teacherId, { from, to }),
    Subscription.countDocuments({ teacherId, status: 'active' }).then((n) => n).catch(() => 0),
    reportTracking.getMonthlyCompletionRatio({ teacherId, year, month }),
  ])
  const counts = Object.fromEntries(sessionRows.map((r) => [r._id, r.count]))
  const scheduledSessions = Object.values(counts).reduce((a, b) => a + b, 0)

  const period = await payrollPeriod.getOrCreatePeriod(teacherId, year, month)
  const periodTotals = await payrollPeriod.getPeriodWithTotals(period._id)

  const snapshot = {
    scheduledSessions,
    conductedSessions: (counts.completed || 0) + (counts.no_show || 0),
    completedSessions: counts.completed || 0,
    cancelledSessions: counts.cancelled || 0,
    postponedSessions: counts.rescheduled || 0,
    submittedReports: missingRatio.reported,
    missingReports: missingRatio.total - missingRatio.reported,
    assignedStudentsCount: assignedCount,
    attendanceSummary: {
      onTime: attendanceSummary.on_time, late: attendanceSummary.late,
      absent: attendanceSummary.absent, excused: attendanceSummary.excused,
      completionRate: attendanceSummary.completionRate, punctualityRate: attendanceSummary.punctualityRate,
    },
    payrollPeriodId: period._id,
    grossEntitlement: periodTotals.grossEntitlement, bonusesTotal: periodTotals.bonusesTotal,
    deductionsTotal: periodTotals.deductionsTotal, settlementsTotal: periodTotals.settlementsTotal,
    netPayable: periodTotals.netPayable, snapshotAt: new Date(),
  }

  const isNewReport = !report
  if (!report) {
    report = new MonthlyTeacherReport({
      teacherId, year, month, periodKey, ...snapshot,
      generatedBy: isSystem ? 'system' : 'admin', generatedByUser: isSystem ? undefined : actorId,
      history: [{ action: 'generated', actorId: isSystem ? undefined : actorId }],
    })
  } else {
    Object.assign(report, snapshot)
    report.history.push({ action: 'regenerated', actorId })
  }
  await report.save()

  // Only nudge the teacher for a fresh auto-generated draft (the monthly
  // cron) — a manual admin (re)generation doesn't need a push, since the
  // admin is already looking at it.
  if (isNewReport && isSystem) {
    await createNotification({
      userId: teacherId,
      titleAr: 'تقريرك الشهري جاهز للمراجعة والإرسال',
      bodyAr: `تم إنشاء مسودة تقريرك الشهري لشهر ${month}/${year} تلقائياً — راجعه وأرسله للإدارة.`,
      type: 'report', priority: 'medium', relatedId: report._id, actionUrl: '/teacher/monthly-reports',
    })
  }
  return report
}

/** Generates (or regenerates) reports for every active teacher for one month — used by the auto-draft cron and the admin's manual "generate all" action. */
async function generateAllForMonth(year, month, { actorId, isSystem = false } = {}) {
  const teachers = await User.find({ role: 'teacher', isActive: true }).select('_id')
  const results = await Promise.allSettled(teachers.map((t) => generateReport(t._id, year, month, { actorId, isSystem })))
  return { attempted: teachers.length, created: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length }
}

async function submitReport(reportId, { teacherId, fields }) {
  const report = await MonthlyTeacherReport.findOne({ _id: reportId, teacherId })
  if (!report) throw new MonthlyReportError('التقرير غير موجود', 404)
  if (!['draft', 'needs_completion'].includes(report.status)) throw new MonthlyReportError('لا يمكن إرسال هذا التقرير في حالته الحالية', 409)
  if (fields?.teacherNotes !== undefined) report.teacherNotes = fields.teacherNotes
  if (fields?.challenges !== undefined) report.challenges = fields.challenges
  if (fields?.recommendations !== undefined) report.recommendations = fields.recommendations
  report.status = 'submitted'
  report.submittedAt = new Date()
  report.history.push({ action: 'submitted', actorId: teacherId })
  await report.save()
  return report
}

async function requestCompletion(reportId, { adminId, note }) {
  if (!note?.trim()) throw new MonthlyReportError('يجب توضيح ما هو مطلوب إكماله', 400, 'note')
  const report = await MonthlyTeacherReport.findById(reportId)
  if (!report) throw new MonthlyReportError('التقرير غير موجود', 404)
  if (report.status !== 'submitted') throw new MonthlyReportError('لا يمكن طلب إكمال تقرير في هذه الحالة', 409)
  report.status = 'needs_completion'
  report.adminNotes = note.trim()
  report.history.push({ action: 'needs_completion', actorId: adminId, note: note.trim() })
  await report.save()
  return report
}

async function markReviewed(reportId, { adminId, note }) {
  const report = await MonthlyTeacherReport.findById(reportId)
  if (!report) throw new MonthlyReportError('التقرير غير موجود', 404)
  if (report.status !== 'submitted') throw new MonthlyReportError('لا يمكن تعليم هذا التقرير كمُراجَع في حالته الحالية', 409)
  report.status = 'reviewed'
  report.reviewedBy = adminId
  report.reviewedAt = new Date()
  if (note) report.adminNotes = note
  report.history.push({ action: 'reviewed', actorId: adminId, note })
  await report.save()
  return report
}

async function approveReport(reportId, { adminId }) {
  const report = await MonthlyTeacherReport.findById(reportId)
  if (!report) throw new MonthlyReportError('التقرير غير موجود', 404)
  if (!['submitted', 'reviewed'].includes(report.status)) throw new MonthlyReportError('لا يمكن اعتماد تقرير في هذه الحالة', 409)
  report.status = 'approved'
  report.approvedAt = new Date()
  report.reviewedBy = report.reviewedBy || adminId
  report.reviewedAt = report.reviewedAt || new Date()
  report.history.push({ action: 'approved', actorId: adminId })
  await report.save()
  return report
}

async function listForTeacher(teacherId, { page = 1, limit = 12 } = {}) {
  const filter = { teacherId }
  const skip = (page - 1) * limit
  const [reports, total] = await Promise.all([
    MonthlyTeacherReport.find(filter).sort({ periodKey: -1 }).skip(skip).limit(limit),
    MonthlyTeacherReport.countDocuments(filter),
  ])
  return { reports, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

async function listForAdmin({ status, periodKey, teacherId, page = 1, limit = 20 } = {}) {
  const filter = {}
  if (status) filter.status = status
  if (periodKey) filter.periodKey = periodKey
  if (teacherId) filter.teacherId = teacherId
  const skip = (page - 1) * limit
  const [reports, total] = await Promise.all([
    MonthlyTeacherReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('teacherId', 'firstNameAr lastNameAr avatar'),
    MonthlyTeacherReport.countDocuments(filter),
  ])
  return { reports, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

module.exports = {
  MonthlyReportError, generateReport, generateAllForMonth, submitReport,
  requestCompletion, markReviewed, approveReport, listForTeacher, listForAdmin,
}

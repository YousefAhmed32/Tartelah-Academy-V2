// Admin (and self-service teacher) endpoints for the hourly payroll +
// financial-adjustments system (Phase 2 §6–§7). Business logic lives in
// services/payrollPeriod.service.js and services/financialAdjustment.service.js
// — this file is request validation, authorization narrowing, and response
// shaping only, matching the convention already established by
// controllers/transfer.controller.js.
const mongoose = require('mongoose')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createNotification } = require('../services/notification.service')
const periodService = require('../services/payrollPeriod.service')
const adjustmentService = require('../services/financialAdjustment.service')
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const User = require('../models/User')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
  next(err)
}

function currentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// ── Periods (admin) ─────────────────────────────────────────────────────────

exports.listOrgPeriods = async (req, res, next) => {
  try {
    const { year, month } = currentYearMonth()
    const result = await periodService.listOrgPeriodsForMonth(
      Number(req.query.year) || year, Number(req.query.month) || month,
      { page: req.query.page, limit: req.query.limit }
    )
    sendSuccess(res, result)
  } catch (err) { handleKnownError(err, res, next) }
}

// A teacher may only ever read their OWN period/entries — never another
// teacher's compensation data (see the brief's explicit "never expose
// compensation data to unauthorized teachers" requirement). Admin routes
// pass through unrestricted (already gated by the payroll.* permission at
// the route layer).
function assertOwnsPeriod(req, period) {
  if (req.user.role !== 'teacher') return true
  return String(period.teacherId?._id || period.teacherId) === String(req.user._id)
}

exports.getPeriod = async (req, res, next) => {
  try {
    const period = await periodService.getPeriodWithTotals(req.params.periodId)
    if (!period) return sendError(res, 'الفترة غير موجودة', 404)
    if (!assertOwnsPeriod(req, period)) return sendError(res, 'غير مصرح', 403)
    sendSuccess(res, period)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getPeriodEntries = async (req, res, next) => {
  try {
    const period = await periodService.getPeriodWithTotals(req.params.periodId)
    if (!period) return sendError(res, 'الفترة غير موجودة', 404)
    if (!assertOwnsPeriod(req, period)) return sendError(res, 'غير مصرح', 403)
    const filter = { periodId: new mongoose.Types.ObjectId(req.params.periodId), voided: false }
    const limit = Math.min(Number(req.query.limit) || 200, 500) // one period is naturally bounded (one teacher, one month)
    const entries = await TeacherPayrollEntry.find(filter).sort({ createdAt: -1 }).limit(limit)
      .populate('sessionId', 'titleAr scheduledAt durationMinutes').populate('createdBy', 'firstNameAr lastNameAr')
    sendSuccess(res, entries)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.listTeacherPeriods = async (req, res, next) => {
  try {
    const teacherId = req.params.teacherId || req.user._id // teacher self-service falls through to their own id
    if (req.user.role === 'teacher' && String(teacherId) !== String(req.user._id)) return sendError(res, 'غير مصرح', 403)
    const result = await periodService.listTeacherPeriods(teacherId, { page: req.query.page, limit: req.query.limit })
    sendSuccess(res, result)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.submitPeriod = async (req, res, next) => {
  try {
    const period = await periodService.submitForReview(req.params.periodId, { actorId: req.user._id, reason: req.body.reason })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'payroll.submit_period', entity: 'TeacherPayrollPeriod', entityId: period._id, ip: req.ip })
    sendSuccess(res, period, 'تم إرسال الفترة للمراجعة')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.approvePeriod = async (req, res, next) => {
  try {
    const period = await periodService.approvePeriod(req.params.periodId, { actorId: req.user._id, reason: req.body.reason })
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'payroll.approve_period',
      entity: 'TeacherPayrollPeriod', entityId: period._id,
      changes: { netPayable: period.netPayable, periodKey: period.periodKey }, ip: req.ip,
    })
    await createNotification({
      userId: period.teacherId, titleAr: 'تم اعتماد راتبك الشهري',
      bodyAr: `تم اعتماد راتب شهر ${period.periodKey} — صافي المستحق: ${period.netPayable}`,
      type: 'payroll', priority: 'medium', actionUrl: `/teacher/payroll/${period._id}`, relatedId: period._id,
    }).catch(() => {})
    sendSuccess(res, period, 'تم اعتماد الفترة')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.markPeriodPaid = async (req, res, next) => {
  try {
    const period = await periodService.markPaid(req.params.periodId, { actorId: req.user._id, reference: req.body.reference, reason: req.body.reason })
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'payroll.mark_paid',
      entity: 'TeacherPayrollPeriod', entityId: period._id, changes: { reference: req.body.reference }, ip: req.ip,
    })
    await createNotification({
      userId: period.teacherId, titleAr: 'تم صرف راتبك',
      bodyAr: `تم صرف راتب شهر ${period.periodKey} — صافي المستحق: ${period.netPayable}`,
      type: 'payroll', priority: 'high', actionUrl: `/teacher/payroll/${period._id}`, relatedId: period._id,
    }).catch(() => {})
    sendSuccess(res, period, 'تم تحديد الفترة كمدفوعة')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.reopenPeriod = async (req, res, next) => {
  try {
    const period = await periodService.reopenPeriod(req.params.periodId, { actorId: req.user._id, reason: req.body.reason })
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'payroll.reopen_period',
      entity: 'TeacherPayrollPeriod', entityId: period._id, changes: { reason: req.body.reason }, ip: req.ip,
    })
    sendSuccess(res, period, 'تمت إعادة فتح الفترة')
  } catch (err) { handleKnownError(err, res, next) }
}

// ── Adjustments (admin) ─────────────────────────────────────────────────────

exports.createAdjustment = async (req, res, next) => {
  try {
    const { type, amount, reason, year, month } = req.body
    const { entry, period } = await adjustmentService.createTeacherAdjustment({
      teacherId: req.params.teacherId, type, amount, reason, year, month, createdBy: req.user._id,
    })
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: `payroll.create_${type}`,
      entity: 'TeacherPayrollEntry', entityId: entry._id, changes: { teacherId: req.params.teacherId, amount: entry.amount, reason }, ip: req.ip,
    })
    const teacher = await User.findById(req.params.teacherId).select('firstNameAr lastNameAr').catch(() => null)
    const tName = teacher ? `${teacher.firstNameAr || ''} ${teacher.lastNameAr || ''}`.trim() : 'المعلم'

    const isPenalty = type === 'penalty'
    const isBonus = type === 'bonus'
    const titleAr = isPenalty ? 'خصم / جزاء مالي' : isBonus ? 'مكافأة مالية' : 'تسوية مالية'
    const bodyAr = isPenalty
      ? `تم تطبيق خصم بمقدار ${Math.abs(entry.amount)} ر.س من مستحقاتك — السبب: ${reason.trim()} (صافي المستحق التقديري: ${period.netPayable} ر.س)`
      : isBonus
      ? `تم صرف مكافأة بمقدار +${entry.amount} ر.س إلى مستحقاتك — السبب: ${reason.trim()} (صافي المستحق التقديري: ${period.netPayable} ر.س)`
      : `تم تعديل مستحقاتك بمقدار ${entry.amount > 0 ? '+' : ''}${entry.amount} ر.س — السبب: ${reason.trim()} (صافي المستحق التقديري: ${period.netPayable} ر.س)`

    // Notify Teacher
    await createNotification({
      userId: req.params.teacherId,
      titleAr,
      bodyAr,
      type: 'payroll',
      priority: isPenalty ? 'high' : 'medium',
      actionUrl: `/teacher/payroll/${period._id}`,
      relatedId: entry._id,
    }).catch(() => {})

    // Notify Admins
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').limit(20)
    await Promise.all(
      admins.map(a =>
        createNotification({
          userId: a._id,
          titleAr: `حركة مالية لمعلم: ${tName}`,
          bodyAr: `${titleAr} بمقدار ${entry.amount > 0 ? '+' : ''}${entry.amount} ر.س للمعلم (${tName}) — السبب: ${reason.trim()}`,
          type: 'payroll',
          priority: 'medium',
          actionUrl: `/admin/payroll`,
        }).catch(() => {})
      )
    )

    sendSuccess(res, { entry, period }, 'تم تسجيل الحركة المالية وإرسال الإشعار بنجاح', 201)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.reverseAdjustment = async (req, res, next) => {
  try {
    const reversal = await adjustmentService.reverseAdjustment(req.params.entryId, { reason: req.body.reason, actorId: req.user._id })
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'payroll.reverse_adjustment',
      entity: 'TeacherPayrollEntry', entityId: reversal._id, changes: { supersedes: reversal.supersedes, reason: req.body.reason }, ip: req.ip,
    })

    const teacher = await User.findById(reversal.teacherId).select('firstNameAr lastNameAr').catch(() => null)
    const tName = teacher ? `${teacher.firstNameAr || ''} ${teacher.lastNameAr || ''}`.trim() : 'المعلم'

    // Notify Teacher
    await createNotification({
      userId: reversal.teacherId,
      titleAr: 'إلغاء / عكس حركة مالية',
      bodyAr: `تم إلغاء الحركة المالية بمقدار ${reversal.amount > 0 ? '+' : ''}${reversal.amount} ر.س — السبب: ${req.body.reason || 'إلغاء إداري'}`,
      type: 'payroll',
      priority: 'medium',
      actionUrl: `/teacher/payroll`,
      relatedId: reversal._id,
    }).catch(() => {})

    // Notify Admins
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').limit(20)
    await Promise.all(
      admins.map(a =>
        createNotification({
          userId: a._id,
          titleAr: `عكس حركة مالية لمعلم: ${tName}`,
          bodyAr: `تم عكس الحركة المالية للمعلم (${tName}) بمقدار ${reversal.amount > 0 ? '+' : ''}${reversal.amount} ر.س`,
          type: 'payroll',
          priority: 'medium',
          actionUrl: `/admin/payroll`,
        }).catch(() => {})
      )
    )

    sendSuccess(res, reversal, 'تم عكس الحركة المالية بنجاح')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.listAdjustments = async (req, res, next) => {
  try {
    const result = await adjustmentService.listAdjustments({
      teacherId: req.query.teacherId, type: req.query.type, periodId: req.query.periodId,
      page: req.query.page, limit: req.query.limit,
    })
    sendSuccess(res, result)
  } catch (err) { handleKnownError(err, res, next) }
}

// ── Self (teacher) ──────────────────────────────────────────────────────────

exports.getMyCurrentPeriod = async (req, res, next) => {
  try {
    const period = await periodService.getOrCreateCurrentPeriod(req.user._id)
    const withTotals = await periodService.getPeriodWithTotals(period._id)
    sendSuccess(res, withTotals)
  } catch (err) { handleKnownError(err, res, next) }
}

// Admin endpoints for active-student transfer and bulk whole-teacher
// replacement (Phase 2 meeting addendum §3–§4). Business logic lives in
// services/transfer.service.js and services/teacherReplacement.service.js —
// this file is request validation + response shaping only.
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const transferService = require('../services/transfer.service')
const batchService = require('../services/teacherReplacement.service')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
  next(err)
}

// ── Single-student transfer ─────────────────────────────────────────────────

exports.previewStudentTransfer = async (req, res, next) => {
  try {
    const result = await transferService.previewStudentTransfer(req.params.studentId, {
      targetTeacherId: req.body.targetTeacherId, effectiveDate: req.body.effectiveDate,
    })
    sendSuccess(res, result)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.executeStudentTransfer = async (req, res, next) => {
  try {
    const { targetTeacherId, effectiveDate, reason, scheduleDecisions } = req.body
    const result = await transferService.executeStudentTransfer(req.params.studentId, {
      targetTeacherId, effectiveDate, reason, scheduleDecisions, actorId: req.user._id,
    })
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'transfer.execute_student_transfer',
      entity: 'StudentTransfer', entityId: result.transfer._id,
      changes: { studentId: req.params.studentId, targetTeacherId }, ip: req.ip,
    })
    sendSuccess(res, result, result.alreadyExecuted ? 'تم تنفيذ هذا النقل مسبقًا' : 'تم نقل الطالب بنجاح', result.alreadyExecuted ? 200 : 201)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getStudentTransferHistory = async (req, res, next) => {
  try {
    sendSuccess(res, await transferService.getStudentTransferHistory(req.params.studentId))
  } catch (err) { handleKnownError(err, res, next) }
}

// ── Bulk teacher replacement ────────────────────────────────────────────────

exports.previewTeacherReplacement = async (req, res, next) => {
  try {
    const result = await batchService.previewTeacherReplacement(req.params.teacherId, req.body.targetTeacherId)
    sendSuccess(res, result)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.createTeacherReplacementBatch = async (req, res, next) => {
  try {
    const { targetTeacherId, reason, effectiveDate, studentIds, deactivateSourceTeacherOnSuccess } = req.body
    const batch = await batchService.createBatch(req.params.teacherId, targetTeacherId, {
      reason, effectiveDate, studentIds, deactivateSourceTeacherOnSuccess, actorId: req.user._id,
    })
    sendSuccess(res, batch, 'تم إنشاء دفعة الاستبدال', 201)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.listTeacherReplacementBatches = async (req, res, next) => {
  try {
    sendSuccess(res, await batchService.listBatches({ page: req.query.page, limit: req.query.limit }))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getTeacherReplacementBatch = async (req, res, next) => {
  try {
    sendSuccess(res, await batchService.loadBatchForDisplay(req.params.batchId))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.setBatchEntryResolution = async (req, res, next) => {
  try {
    const batch = await batchService.setEntryResolution(req.params.batchId, req.params.studentId, req.body.resolvedSchedule)
    sendSuccess(res, batch, 'تم حفظ الموعد البديل')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.runTeacherReplacementBatch = async (req, res, next) => {
  try {
    const batch = await batchService.runBatch(req.params.batchId, { actorId: req.user._id })
    sendSuccess(res, batch, 'تم تشغيل الدفعة')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.retryTeacherReplacementBatch = async (req, res, next) => {
  try {
    const batch = await batchService.retryBatch(req.params.batchId, { actorId: req.user._id })
    sendSuccess(res, batch, 'تمت إعادة المحاولة')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.cancelTeacherReplacementBatch = async (req, res, next) => {
  try {
    const batch = await batchService.cancelBatch(req.params.batchId, { actorId: req.user._id })
    sendSuccess(res, batch, 'تم إلغاء الدفعة')
  } catch (err) { handleKnownError(err, res, next) }
}

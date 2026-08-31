// Admin-side endpoints for the assignment-request workflow (Phase 2 Part 2
// §6–§11): creating a request (direct for existing students, pending
// approval or immediate-override for new ones), the follow-up queue actions
// (edit & resend / reassign / cancel), and the availability engine the
// wizard/schedule UI queries. Business logic lives in
// services/assignment.service.js / services/availability.service.js.
const { sendSuccess, sendError } = require('../utils/response')
const { userHasPermission } = require('../middleware/rbac.middleware')
const assignmentService = require('../services/assignment.service')
const availabilityService = require('../services/availability.service')
const User = require('../models/User')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, {
    ...(err.field ? { field: err.field } : {}),
    ...(err.conflicts ? { conflicts: err.conflicts } : {}),
    ...(err.alternativeSlots ? { alternativeSlots: err.alternativeSlots } : {}),
  })
  next(err)
}

exports.createAssignment = async (req, res, next) => {
  try {
    const {
      studentId, teacherId, studentType, specialization, ageCategory, studentAge,
      lessonDurationMinutes, schedule, teachingType, adminNotes, editedMessage,
      immediateOverride, overrideReason, correlationId,
    } = req.body

    const overrideAllowed = userHasPermission(req.user, 'assignments.override')
    const { assignmentRequest, replayed } = await assignmentService.createAssignmentRequest({
      studentId, teacherId, studentType, specialization, ageCategory, studentAge,
      lessonDurationMinutes, schedule, teachingType, adminNotes, editedMessage,
      immediateOverride: !!immediateOverride, overrideReason, overrideAllowed,
      correlationId, actorId: req.user._id, actorRole: req.user.role,
    })
    sendSuccess(res, { assignmentRequest }, replayed ? 'تم إنشاء هذا الطلب مسبقًا' : 'تم إنشاء طلب الإسناد', 201)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.listAssignments = async (req, res, next) => {
  try {
    const { status, teacherId, studentId, page, limit } = req.query
    const statusFilter = status ? String(status).split(',').map((s) => s.trim()).filter(Boolean) : undefined
    const result = await assignmentService.listForAdmin({ status: statusFilter, teacherId, studentId, page, limit })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

// GET /admin/assignments/status-counts — powers the monitoring page's tab
// badges. Must stay registered ahead of GET /assignments/:id in the router
// or Express would swallow "status-counts" as an :id.
exports.getStatusCounts = async (req, res, next) => {
  try {
    const counts = await assignmentService.getStatusCounts()
    sendSuccess(res, counts)
  } catch (err) { next(err) }
}

exports.getAssignment = async (req, res, next) => {
  try {
    const AssignmentRequest = require('../models/AssignmentRequest')
    const doc = await AssignmentRequest.findById(req.params.id)
      .populate('studentId', 'firstNameAr lastNameAr email avatar gender studentType')
      .populate('teacherId', 'firstNameAr lastNameAr email avatar gender')
      .populate('previousRequestId', 'status teacherId createdAt')
      .populate('replacementRequestId', 'status teacherId createdAt')
    if (!doc) return sendError(res, 'الطلب غير موجود', 404)
    sendSuccess(res, doc)
  } catch (err) { next(err) }
}

exports.editAndResend = async (req, res, next) => {
  try {
    const doc = await assignmentService.editAndResend({
      assignmentRequestId: req.params.id, updates: req.body || {},
      actorId: req.user._id, actorRole: req.user.role,
    })
    sendSuccess(res, { assignmentRequest: doc }, 'تم تعديل الطلب وإعادة إرساله للمعلم')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.reassign = async (req, res, next) => {
  try {
    const { newTeacherId, schedule, reason, immediateOverride, overrideReason } = req.body
    const overrideAllowed = userHasPermission(req.user, 'assignments.override')
    const result = await assignmentService.reassign({
      assignmentRequestId: req.params.id, newTeacherId, scheduleOverrides: schedule, reason,
      immediateOverride: !!immediateOverride, overrideReason, overrideAllowed,
      actorId: req.user._id, actorRole: req.user.role,
    })
    sendSuccess(res, result, 'تم إعادة إسناد الطالب لمعلم آخر')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.cancelAssignment = async (req, res, next) => {
  try {
    const { reason } = req.body
    if (!reason || !String(reason).trim()) return sendError(res, 'سبب الإلغاء مطلوب', 400)
    const doc = await assignmentService.cancelAssignment({
      assignmentRequestId: req.params.id, actorId: req.user._id, actorRole: req.user.role, reason,
    })
    sendSuccess(res, { assignmentRequest: doc }, 'تم إلغاء طلب الإسناد')
  } catch (err) { handleKnownError(err, res, next) }
}

// GET /admin/teachers/:id/availability?durationMinutes=60&timezone=
exports.getTeacherAvailability = async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('_id')
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)
    const durationMinutes = Number(req.query.durationMinutes) || 60
    if (!assignmentService.ALLOWED_DURATIONS.includes(durationMinutes)) return sendError(res, 'مدة الحصة غير صالحة', 400)
    const result = await availabilityService.getWeeklyAvailability({
      teacherId: teacher._id, durationMinutes, timezone: req.query.timezone || undefined,
    })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

// POST /admin/assignments/check-availability — used by the wizard/schedule UI
// for live inline conflict feedback before submitting; the backend always
// re-checks again authoritatively at the actual write step regardless.
exports.checkAvailability = async (req, res, next) => {
  try {
    const { teacherId, studentId, days, durationMinutes, timezone } = req.body
    if (!teacherId) return sendError(res, 'يجب اختيار معلم', 400)
    if (!assignmentService.ALLOWED_DURATIONS.includes(Number(durationMinutes))) return sendError(res, 'مدة الحصة غير صالحة', 400)
    const result = await availabilityService.checkAvailability({
      teacherId, studentId, days, durationMinutes: Number(durationMinutes), timezone,
    })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

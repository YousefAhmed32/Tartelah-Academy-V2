// Teacher-facing "طلبات الطلاب" inbox (Phase 2 Part 2 §10) — list own
// assignment requests and respond (accept / reject / propose alternative
// time). Ownership is enforced in services/assignment.service.js
// (respondToAssignment checks assignmentRequest.teacherId === teacherId), so
// a teacher can never act on — or, via getMyAssignmentRequest below, even
// read — another teacher's request (closes an IDOR class of bug).
const AssignmentRequest = require('../models/AssignmentRequest')
const assignmentService = require('../services/assignment.service')
const availabilityService = require('../services/availability.service')
const { sendSuccess, sendError } = require('../utils/response')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, {
    ...(err.field ? { field: err.field } : {}),
    ...(err.conflicts ? { conflicts: err.conflicts } : {}),
    ...(err.alternativeSlots ? { alternativeSlots: err.alternativeSlots } : {}),
  })
  next(err)
}

exports.listMyAssignmentRequests = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query
    const statusFilter = status ? String(status).split(',').map((s) => s.trim()).filter(Boolean) : undefined
    const result = await assignmentService.listForTeacher({ teacherId: req.user._id, status: statusFilter, page, limit })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

exports.getMyAssignmentRequest = async (req, res, next) => {
  try {
    const doc = await AssignmentRequest.findOne({ _id: req.params.id, teacherId: req.user._id })
      .populate('studentId', 'firstNameAr lastNameAr email avatar gender studentType')
    if (!doc) return sendError(res, 'الطلب غير موجود', 404)
    sendSuccess(res, doc)
  } catch (err) { next(err) }
}

// GET /teachers/me/assignment-requests/:id/availability — powers the
// redesigned "propose alternative time" picker. Deliberately NOT the general
// admin availability endpoint (GET /admin/teachers/:id/availability,
// requirePermission('teachers.view')) — ownership here is enforced by
// scoping the lookup to THIS teacher's own request (identical guard as
// getMyAssignmentRequest above), never by trusting a teacherId the client
// could otherwise pass directly. The lesson duration is always the
// request's own (a proposed alternative changes day/time, never duration).
exports.getMyAssignmentRequestAvailability = async (req, res, next) => {
  try {
    const doc = await AssignmentRequest.findOne({ _id: req.params.id, teacherId: req.user._id })
    if (!doc) return sendError(res, 'الطلب غير موجود', 404)
    if (doc.status !== 'pending_teacher_approval') {
      return sendError(res, 'لم يعد هذا الطلب بانتظار ردكم', 409)
    }

    const [weekly, suggestions] = await Promise.all([
      availabilityService.getWeeklyAvailability({
        teacherId: doc.teacherId, durationMinutes: doc.lessonDurationMinutes,
        timezone: doc.schedule.timezone, excludeAssignmentRequestId: doc._id,
      }),
      availabilityService.suggestAlternativeSlots({
        teacherId: doc.teacherId, days: doc.schedule.days, durationMinutes: doc.lessonDurationMinutes,
        timezone: doc.schedule.timezone, excludeAssignmentRequestId: doc._id, maxResults: 3,
      }),
    ])

    sendSuccess(res, { ...weekly, suggestions })
  } catch (err) { next(err) }
}

exports.respond = async (req, res, next) => {
  try {
    const { action, reason, proposedTime, proposedSchedule, note } = req.body
    if (!['accept', 'reject', 'time_change'].includes(action)) return sendError(res, 'إجراء غير معروف', 400)
    const doc = await assignmentService.respondToAssignment({
      assignmentRequestId: req.params.id, teacherId: req.user._id, action, reason, proposedTime, proposedSchedule, note,
      actorRole: req.user.role,
    })
    const messages = {
      accept: 'تم قبول الطالب وتفعيل الجدول بنجاح',
      reject: 'تم رفض الطلب',
      time_change: 'تم إرسال طلب تعديل الموعد للإدارة',
    }
    sendSuccess(res, { assignmentRequest: doc }, messages[action])
  } catch (err) { handleKnownError(err, res, next) }
}

// Admin endpoints for the incremental, resumable onboarding session (Phase 2
// Part 2c) — the sibling flow to adminOnboarding.controller.js's one-shot
// wizard. Business logic lives in services/onboardingSession.service.js;
// this file is request validation + response shaping + audit-friendly error
// surfacing (conflicts / lock races / blocking issues all pass through to
// the frontend so it can show real alternatives instead of a generic error).
const { sendSuccess, sendError } = require('../utils/response')
const { userHasPermission } = require('../middleware/rbac.middleware')
const onboardingSessionService = require('../services/onboardingSession.service')

function handleKnownError(err, res, next) {
  if (err.status) {
    return sendError(res, err.message, err.status, {
      ...(err.field ? { field: err.field } : {}),
      ...(err.conflicts ? { conflicts: err.conflicts } : {}),
      ...(err.lockConflict ? { lockConflict: true } : {}),
      ...(err.alternativeSlots ? { alternativeSlots: err.alternativeSlots } : {}),
      ...(err.blockingIssues ? { blockingIssues: err.blockingIssues } : {}),
    })
  }
  next(err)
}

// POST /admin/onboarding/sessions — start a session (persists the teacher
// immediately; idempotent per clientRequestId).
exports.startSession = async (req, res, next) => {
  try {
    const { clientRequestId, teacher, workingHours } = req.body
    let result
    try {
      result = await onboardingSessionService.startOnboardingSession({
        clientRequestId, teacher, workingHours, actorId: req.user._id, actorRole: req.user.role,
      })
    } catch (err) { return handleKnownError(err, res, next) }
    sendSuccess(res, result, result.replayed ? 'تم استئناف جلسة الإعداد' : 'تم حفظ بيانات المعلم', 201)
  } catch (err) { next(err) }
}

// GET /admin/onboarding/sessions/:id — resume: reloads teacher + every saved
// student's backend-authoritative summary.
exports.getSession = async (req, res, next) => {
  try {
    let result
    try {
      result = await onboardingSessionService.getOnboardingSession({ sessionId: req.params.id })
    } catch (err) { return handleKnownError(err, res, next) }
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

// GET /admin/onboarding/sessions — bounded list, for an admin resuming an
// in-progress onboarding they (or a colleague) started earlier.
exports.listSessions = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query
    const result = await onboardingSessionService.listOnboardingSessions({ status, page, limit })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

// POST /admin/onboarding/sessions/:id/students — save one student
// incrementally (validates, reserves the schedule server-side, and only then
// reports success).
exports.saveStudent = async (req, res, next) => {
  try {
    const { clientRequestId, student } = req.body
    let result
    try {
      result = await onboardingSessionService.saveStudentToSession({
        sessionId: req.params.id, clientRequestId, student,
        actorId: req.user._id, actorRole: req.user.role,
        overrideAllowed: userHasPermission(req.user, 'assignments.override'),
      })
    } catch (err) { return handleKnownError(err, res, next) }
    sendSuccess(res, result, result.replayed ? 'تم حفظ هذا الطالب مسبقًا' : 'تم حفظ الطالب وحجز الموعد', 201)
  } catch (err) { next(err) }
}

// DELETE /admin/onboarding/sessions/:id/students/:studentId — remove a
// student from an in-progress session (releases their reservation first).
exports.removeStudent = async (req, res, next) => {
  try {
    let result
    try {
      result = await onboardingSessionService.removeStudentFromSession({
        sessionId: req.params.id, studentId: req.params.studentId,
        actorId: req.user._id, actorRole: req.user.role, reason: req.body?.reason,
      })
    } catch (err) { return handleKnownError(err, res, next) }
    sendSuccess(res, result, 'تم حذف الطالب من هذه العملية')
  } catch (err) { next(err) }
}

// POST /admin/onboarding/sessions/:id/finalize — idempotent; reloads every
// student from the backend and blocks on any unresolved issue.
exports.finalizeSession = async (req, res, next) => {
  try {
    let result
    try {
      result = await onboardingSessionService.finalizeOnboardingSession({
        sessionId: req.params.id, actorId: req.user._id, actorRole: req.user.role,
      })
    } catch (err) { return handleKnownError(err, res, next) }
    sendSuccess(res, result, result.replayed ? 'تم إنهاء هذه العملية مسبقًا' : 'تم إنهاء إعداد المعلم بنجاح')
  } catch (err) { next(err) }
}

// POST /admin/onboarding/sessions/:id/cancel — explicit reason required;
// deletes the teacher + every student saved in this session.
exports.cancelSession = async (req, res, next) => {
  try {
    let result
    try {
      result = await onboardingSessionService.cancelOnboardingSession({
        sessionId: req.params.id, actorId: req.user._id, actorRole: req.user.role, reason: req.body?.reason,
      })
    } catch (err) { return handleKnownError(err, res, next) }
    sendSuccess(res, result, 'تم إلغاء عملية الإعداد')
  } catch (err) { next(err) }
}

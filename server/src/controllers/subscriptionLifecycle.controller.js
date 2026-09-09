// Admin endpoints for the complete subscription pause/resume lifecycle
// (Phase 2 meeting addendum §2). Business logic lives in
// services/subscriptionLifecycle.service.js — this file is request
// validation + response shaping, matching every other controller's
// convention in this codebase.
const { sendSuccess, sendError } = require('../utils/response')
const lifecycleService = require('../services/subscriptionLifecycle.service')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
  next(err)
}

exports.previewPause = async (req, res, next) => {
  try {
    const result = await lifecycleService.previewPause(req.params.id, { effectiveDate: req.query.effectiveDate })
    sendSuccess(res, result)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.pauseSubscription = async (req, res, next) => {
  try {
    const { reason, effectiveDate, plannedResumeDate } = req.body
    const result = await lifecycleService.pauseSubscription(req.params.id, {
      reason, effectiveDate, plannedResumeDate, actorId: req.user._id,
    })
    sendSuccess(res, result, result.alreadyPaused ? 'الاشتراك موقوف بالفعل' : 'تم إيقاف الاشتراك مؤقتًا', result.alreadyPaused ? 200 : 201)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.resumeSubscription = async (req, res, next) => {
  try {
    const result = await lifecycleService.resumeSubscription(req.params.id, { actorId: req.user._id })
    sendSuccess(res, result, result.alreadyResumed ? 'الاشتراك نشط بالفعل' : 'تم استئناف الاشتراك')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getPauseHistory = async (req, res, next) => {
  try {
    const history = await lifecycleService.getPauseHistory(req.params.studentId)
    sendSuccess(res, history)
  } catch (err) { handleKnownError(err, res, next) }
}

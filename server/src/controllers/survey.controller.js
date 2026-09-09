const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createNotification, createNotifications } = require('../services/notification.service')
const User = require('../models/User')
const svc = require('../services/survey.service')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
  next(err)
}

// ── Student ──────────────────────────────────────────────────────────────────

exports.getMyPending = async (req, res, next) => {
  try { sendSuccess(res, await svc.getMyPendingSurvey(req.user._id)) }
  catch (err) { handleKnownError(err, res, next) }
}

exports.submitMyResponse = async (req, res, next) => {
  try {
    const survey = await svc.submitResponse(req.params.id, { studentId: req.user._id, responses: req.body })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'survey.submit', entity: 'Survey', entityId: survey._id, ip: req.ip })

    if (survey.requestAdminContact || survey.requestTeacherChange) {
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
      await createNotifications(admins.map((a) => ({
        userId: a._id, titleAr: survey.requestTeacherChange ? 'طلب تغيير معلم من استبيان' : 'طلب تواصل من استبيان',
        bodyAr: 'طالب أرسل استبيان تقييم يطلب متابعة الإدارة', type: 'survey', priority: 'high',
        relatedId: survey._id, actionUrl: '/admin/surveys',
      }))).catch(() => {})
    }
    sendSuccess(res, survey, 'شكرًا لك على إجابتك')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.skipMy = async (req, res, next) => {
  try { sendSuccess(res, await svc.skipSurvey(req.params.id, { studentId: req.user._id })) }
  catch (err) { handleKnownError(err, res, next) }
}

// ── Admin ────────────────────────────────────────────────────────────────────

exports.getAll = async (req, res, next) => {
  try {
    sendSuccess(res, await svc.listForAdmin({
      status: req.query.status, requestAdminContact: req.query.requestAdminContact,
      requestTeacherChange: req.query.requestTeacherChange, page: req.query.page, limit: req.query.limit,
    }))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getAggregate = async (req, res, next) => {
  try { sendSuccess(res, await svc.getAggregateResults({ teacherId: req.query.teacherId })) }
  catch (err) { handleKnownError(err, res, next) }
}

exports.markFollowedUp = async (req, res, next) => {
  try {
    const survey = await svc.markFollowedUp(req.params.id, { adminId: req.user._id })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'survey.followed_up', entity: 'Survey', entityId: survey._id, ip: req.ip })
    sendSuccess(res, survey, 'تم تسجيل المتابعة')
  } catch (err) { handleKnownError(err, res, next) }
}

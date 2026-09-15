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

exports.ensureForSubscription = async (req, res, next) => {
  try {
    const result = await svc.ensureSurveyForSubscription(req.user._id, req.params.subscriptionId)
    sendSuccess(res, result)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.submitMyResponse = async (req, res, next) => {
  try {
    const survey = await svc.submitResponse(req.params.id, { studentId: req.user._id, responses: req.body })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'survey.submit', entity: 'Survey', entityId: survey._id, ip: req.ip })

    // Notify all active admins for every survey submission with actionable detail
    const studentName = `${req.user.firstNameAr || ''} ${req.user.lastNameAr || ''}`.trim() || 'طالب'
    const renewalLabel = survey.renewalIntention === 'yes' ? 'ينوي التجديد' : survey.renewalIntention === 'no' ? 'لا ينوي التجديد' : 'لم يقرر'

    let titleAr = `📝 استبيان تقييم دورة جديد من ${studentName}`
    let bodyAr = `أرسل الطالب ${studentName} تقييم الدورة. نية التجديد: (${renewalLabel})`
    let priority = 'medium'

    if (survey.requestTeacherChange) {
      titleAr = `⚠️ طلب تغيير معلم من استبيان الطالب: ${studentName}`
      bodyAr = `طلب الطالب ${studentName} تغيير المعلم في استبيان التجديد. يرجى المتابعة والتنسيق.`
      priority = 'high'
    } else if (survey.requestAdminContact) {
      titleAr = `📞 طلب تواصل إداري من الطالب: ${studentName}`
      bodyAr = `طلب الطالب ${studentName} تواصل الإدارة معه في استبيان التقييم.`
      priority = 'high'
    }

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    await createNotifications(admins.map((a) => ({
      userId: a._id,
      titleAr,
      bodyAr,
      type: 'survey',
      priority,
      relatedId: survey._id,
      actionUrl: `/admin/surveys?id=${survey._id}`,
    }))).catch(() => {})

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
      status: req.query.status,
      requestAdminContact: req.query.requestAdminContact,
      requestTeacherChange: req.query.requestTeacherChange,
      renewalIntention: req.query.renewalIntention,
      teacherId: req.query.teacherId,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    }))
  } catch (err) { handleKnownError(err, res, next) }
}

exports.getById = async (req, res, next) => {
  try {
    sendSuccess(res, await svc.getSurveyById(req.params.id))
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

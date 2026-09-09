// Evaluation/renewal survey (Phase 2 §13).
const mongoose = require('mongoose')
const Survey = require('../models/Survey')
const Subscription = require('../models/Subscription')
const AcademySettings = require('../models/AcademySettings')
const { createNotification } = require('./notification.service')

class SurveyError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

async function getSurveyLeadDays() {
  const settings = await AcademySettings.findOne().select('surveyLeadDays')
  return Number.isFinite(settings?.surveyLeadDays) ? settings.surveyLeadDays : 7
}

/**
 * Creates a pending survey for every active subscription entering its
 * configured lead window before expiry — idempotent (unique index on
 * subscriptionId means a retried/duplicate run is a safe no-op, never a
 * second survey for the same renewal cycle).
 */
async function triggerDueSurveys() {
  const leadDays = await getSurveyLeadDays()
  const now = new Date()
  const windowEnd = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000)

  const dueSubscriptions = await Subscription.find({ status: 'active', endDate: { $gte: now, $lte: windowEnd } }).select('studentId teacherId')
  let created = 0
  for (const sub of dueSubscriptions) {
    try {
      const survey = await Survey.create({ studentId: sub.studentId, subscriptionId: sub._id, teacherId: sub.teacherId })
      created += 1
      await createNotification({
        userId: sub.studentId,
        titleAr: 'استبيان قصير قبل تجديد اشتراكك',
        bodyAr: 'شاركنا رأيك عن تجربتك — يساعدنا هذا على تحسين الخدمة قبل تجديد اشتراكك.',
        type: 'survey', priority: 'medium', relatedId: survey._id, actionUrl: '/student/subscription',
      })
    } catch (err) {
      if (err.code !== 11000) throw err // duplicate-key = already exists for this subscription, safe no-op
    }
  }
  return { checked: dueSubscriptions.length, created }
}

/** The student's currently pending survey, if any — null when nothing is due. */
async function getMyPendingSurvey(studentId) {
  return Survey.findOne({ studentId, status: 'pending' })
    .populate('teacherId', 'firstNameAr lastNameAr avatar')
    .populate('subscriptionId', 'packageNameAr endDate')
}

async function submitResponse(surveyId, { studentId, responses }) {
  const survey = await Survey.findOne({ _id: surveyId, studentId })
  if (!survey) throw new SurveyError('الاستبيان غير موجود', 404)
  if (survey.status !== 'pending') throw new SurveyError('تم الرد على هذا الاستبيان بالفعل', 409)

  const FIELDS = [
    'teacherCommitmentRating', 'academyFollowUpRating', 'reportQualityRating', 'studentProgressRating',
    'recommendLikelihood', 'notes', 'renewalIntention', 'continueWithSameTeacher', 'requestTeacherChange', 'requestAdminContact',
  ]
  FIELDS.forEach((k) => { if (responses[k] !== undefined) survey[k] = responses[k] })
  survey.status = 'completed'
  survey.completedAt = new Date()
  await survey.save()
  return survey
}

async function skipSurvey(surveyId, { studentId }) {
  const survey = await Survey.findOne({ _id: surveyId, studentId })
  if (!survey) throw new SurveyError('الاستبيان غير موجود', 404)
  if (survey.status !== 'pending') return survey
  survey.status = 'skipped'
  await survey.save()
  return survey
}

async function markFollowedUp(surveyId, { adminId }) {
  const survey = await Survey.findById(surveyId)
  if (!survey) throw new SurveyError('الاستبيان غير موجود', 404)
  survey.followedUpBy = adminId
  survey.followedUpAt = new Date()
  await survey.save()
  return survey
}

async function listForAdmin({ status, requestAdminContact, requestTeacherChange, page = 1, limit = 20 } = {}) {
  const filter = {}
  if (status) filter.status = status
  if (requestAdminContact !== undefined) filter.requestAdminContact = requestAdminContact === 'true' || requestAdminContact === true
  if (requestTeacherChange !== undefined) filter.requestTeacherChange = requestTeacherChange === 'true' || requestTeacherChange === true
  const skip = (page - 1) * limit
  const [surveys, total] = await Promise.all([
    Survey.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('studentId', 'firstNameAr lastNameAr avatar email phone')
      .populate('teacherId', 'firstNameAr lastNameAr avatar'),
    Survey.countDocuments(filter),
  ])
  return { surveys, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

/** Aggregate averages across every completed survey — the only teacher-visible surface, and only in aggregate, never a raw individual response. */
async function getAggregateResults({ teacherId } = {}) {
  const match = { status: 'completed' }
  if (teacherId) match.teacherId = new mongoose.Types.ObjectId(teacherId)
  const rows = await Survey.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgTeacherCommitment: { $avg: '$teacherCommitmentRating' },
        avgAcademyFollowUp: { $avg: '$academyFollowUpRating' },
        avgReportQuality: { $avg: '$reportQualityRating' },
        avgStudentProgress: { $avg: '$studentProgressRating' },
        avgRecommendLikelihood: { $avg: '$recommendLikelihood' },
        renewYes: { $sum: { $cond: [{ $eq: ['$renewalIntention', 'yes'] }, 1, 0] } },
        renewNo: { $sum: { $cond: [{ $eq: ['$renewalIntention', 'no'] }, 1, 0] } },
      },
    },
  ])
  return rows[0] || { count: 0 }
}

module.exports = {
  SurveyError, triggerDueSurveys, getMyPendingSurvey, submitResponse, skipSurvey,
  markFollowedUp, listForAdmin, getAggregateResults, getSurveyLeadDays,
}

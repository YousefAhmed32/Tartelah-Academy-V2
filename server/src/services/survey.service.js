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

/**
 * Ensures a survey document exists for a student's subscription when initiating renewal.
 * If none exists, creates it in 'pending' status. If previously skipped, reopens it to 'pending'.
 * Returns { survey, requiresSurvey: boolean }
 */
async function ensureSurveyForSubscription(studentId, subscriptionId) {
  const sub = await Subscription.findOne({ _id: subscriptionId, studentId })
  if (!sub) throw new SurveyError('الاشتراك غير موجود', 404)

  let survey = await Survey.findOne({ subscriptionId: sub._id })
  if (!survey) {
    try {
      survey = await Survey.create({
        studentId: sub.studentId,
        subscriptionId: sub._id,
        teacherId: sub.teacherId,
        status: 'pending',
      })
    } catch (err) {
      if (err.code === 11000) {
        survey = await Survey.findOne({ subscriptionId: sub._id })
      } else {
        throw err
      }
    }
  } else if (survey.status === 'skipped') {
    // If skipped earlier, reopen as pending so the student completes it for renewal
    survey.status = 'pending'
    await survey.save()
  }

  await survey.populate([
    { path: 'teacherId', select: 'firstNameAr lastNameAr avatar' },
    { path: 'subscriptionId', select: 'packageNameAr endDate' },
  ])

  return {
    survey,
    requiresSurvey: survey.status === 'pending',
  }
}

async function submitResponse(surveyId, { studentId, responses = {} }) {
  const survey = await Survey.findOne({ _id: surveyId, studentId })
  if (!survey) throw new SurveyError('الاستبيان غير موجود', 404)
  if (survey.status !== 'pending') throw new SurveyError('تم الرد على هذا الاستبيان بالفعل', 409)

  const RATING_FIELDS = [
    'teacherCommitmentRating', 'academyFollowUpRating', 'reportQualityRating',
    'studentProgressRating', 'recommendLikelihood',
  ]
  RATING_FIELDS.forEach((k) => {
    if (responses[k] !== undefined && responses[k] !== null && responses[k] !== '') {
      const val = Number(responses[k])
      if (Number.isInteger(val) && val >= 1 && val <= 5) {
        survey[k] = val
      }
    }
  })

  // Sanitize renewalIntention — prevent empty string from breaking Mongoose enum
  if (responses.renewalIntention !== undefined && responses.renewalIntention !== null && responses.renewalIntention !== '') {
    if (['yes', 'no', 'undecided'].includes(responses.renewalIntention)) {
      survey.renewalIntention = responses.renewalIntention
    } else {
      throw new SurveyError('يرجى تحديد نيتك بشأن تجديد الاشتراك (نعم / لم أقرر / لا)', 400, { field: 'renewalIntention' })
    }
  } else {
    survey.renewalIntention = undefined
  }

  if (typeof responses.notes === 'string') {
    survey.notes = responses.notes.trim()
  }

  const BOOLEAN_FIELDS = ['continueWithSameTeacher', 'requestTeacherChange', 'requestAdminContact']
  BOOLEAN_FIELDS.forEach((k) => {
    if (responses[k] !== undefined) survey[k] = Boolean(responses[k])
  })

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

async function getSurveyById(surveyId) {
  const survey = await Survey.findById(surveyId)
    .populate('studentId', 'firstNameAr lastNameAr avatar email phone country')
    .populate('teacherId', 'firstNameAr lastNameAr avatar phone email')
    .populate('subscriptionId', 'packageNameAr startDate endDate')
    .populate('followedUpBy', 'firstNameAr lastNameAr')
  if (!survey) throw new SurveyError('الاستبيان غير موجود', 404)
  return survey
}

async function listForAdmin({
  status,
  requestAdminContact,
  requestTeacherChange,
  renewalIntention,
  teacherId,
  search,
  page = 1,
  limit = 20,
} = {}) {
  const filter = {}
  if (status) filter.status = status
  if (requestAdminContact !== undefined && requestAdminContact !== '') {
    filter.requestAdminContact = requestAdminContact === 'true' || requestAdminContact === true
  }
  if (requestTeacherChange !== undefined && requestTeacherChange !== '') {
    filter.requestTeacherChange = requestTeacherChange === 'true' || requestTeacherChange === true
  }
  if (renewalIntention) filter.renewalIntention = renewalIntention
  if (teacherId) filter.teacherId = teacherId

  if (search && search.trim()) {
    const term = search.trim()
    const matchingUsers = await mongoose.model('User').find({
      $or: [
        { firstNameAr: { $regex: term, $options: 'i' } },
        { lastNameAr: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ],
    }).select('_id')
    const userIds = matchingUsers.map((u) => u._id)
    filter.$or = [
      { studentId: { $in: userIds } },
      { teacherId: { $in: userIds } },
      { notes: { $regex: term, $options: 'i' } },
    ]
  }

  const skip = (page - 1) * limit
  const [surveys, total] = await Promise.all([
    Survey.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'firstNameAr lastNameAr avatar email phone')
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
      .populate('subscriptionId', 'packageNameAr startDate endDate')
      .populate('followedUpBy', 'firstNameAr lastNameAr'),
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
  SurveyError, triggerDueSurveys, getMyPendingSurvey, ensureSurveyForSubscription, submitResponse, skipSurvey,
  markFollowedUp, listForAdmin, getSurveyById, getAggregateResults, getSurveyLeadDays,
}

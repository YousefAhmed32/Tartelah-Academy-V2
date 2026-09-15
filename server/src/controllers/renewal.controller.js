// Subscription renewal request lifecycle (Phase 2 §9) — mirrors
// enrollment.controller.js's proven submit → proof → review shape exactly.
// Business execution (Subscription creation, wallet credit, optional
// teacher-change transfer) lives in services/renewal.service.js.
const mongoose = require('mongoose')
const Subscription = require('../models/Subscription')
const SubscriptionRenewalRequest = require('../models/SubscriptionRenewalRequest')
const Package = require('../models/Package')
const User = require('../models/User')
const Survey = require('../models/Survey')
const { createNotification, createNotifications } = require('../services/notification.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')
const { logAction } = require('../services/audit.service')
const { uploadBuffer, deleteFile } = require('../services/media.service')
const renewalService = require('../services/renewal.service')

// ── Student ──────────────────────────────────────────────────────────────────

// Submit a renewal request against one of the student's OWN subscriptions.
exports.submitRequest = async (req, res, next) => {
  try {
    const { packageId, teacherId, paymentMethod, paymentReference, studentNotes } = req.body
    const studentId = req.user._id
    const subscriptionId = req.params.id

    const sub = await Subscription.findOne({ _id: subscriptionId, studentId })
    if (!sub) return sendError(res, 'الاشتراك غير موجود', 404)

    const pkg = await Package.findById(packageId || sub.packageId)
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)
    if (!pkg.isActive) return sendError(res, 'هذه الباقة غير متاحة حالياً', 400)

    // Check if there is an uncompleted survey for this subscription cycle
    const survey = await Survey.findOne({ subscriptionId: sub._id })
    if (survey && survey.status === 'pending') {
      return sendError(res, 'يرجى إكمال استبيان تقييم التجربة وتحديد رغبتك بالاستمرار مع المعلم أولاً قبل تقديم طلب التجديد', 400, {
        requiresSurvey: true,
        surveyId: survey._id,
      })
    }

    // Only one pending/under_review renewal request at a time, matching
    // EnrollmentRequest's identical duplicate-submission guard.
    const existing = await SubscriptionRenewalRequest.findOne({ studentId, status: { $in: ['pending', 'under_review'] } })
    if (existing) return sendError(res, 'لديك طلب تجديد قيد المراجعة بالفعل', 400)

    const request = await SubscriptionRenewalRequest.create({
      studentId, currentSubscriptionId: sub._id, requestedPackageId: pkg._id,
      requestedTeacherId: teacherId || sub.teacherId,
      amount: pkg.price, paymentMethod: paymentMethod || 'bank_transfer', paymentReference, studentNotes,
    })
    await request.populate(['requestedPackageId', 'studentId', 'requestedTeacherId'])

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    await createNotifications(admins.map((admin) => ({
      userId: admin._id, titleAr: 'طلب تجديد اشتراك جديد',
      bodyAr: `قدّم ${req.user.firstNameAr} ${req.user.lastNameAr} طلب تجديد لباقة "${pkg.nameAr}"`,
      type: 'renewal', relatedId: request._id, actionUrl: '/admin/subscriptions/renewals',
    })))

    sendSuccess(res, request, 'تم إرسال طلب التجديد بنجاح', 201)
  } catch (err) { next(err) }
}

exports.uploadPaymentProof = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'لم يتم رفع أي ملف', 400)
    const request = await SubscriptionRenewalRequest.findOne({ _id: req.params.id, studentId: req.user._id })
    if (!request) return sendError(res, 'الطلب غير موجود', 404)
    if (!['pending', 'under_review'].includes(request.status)) return sendError(res, 'لا يمكن تحديث هذا الطلب', 400)

    const oldProofId = request.paymentProofId
    request.paymentProofId = await uploadBuffer({
      buffer: req.file.buffer, filename: `renewal_proof_${req.user._id}_${Date.now()}`, mimetype: req.file.mimetype,
      metadata: { category: 'payment-proof', uploadedBy: req.user._id, private: true },
    })
    if (request.status === 'pending') request.status = 'under_review'
    await request.save()
    if (oldProofId) await deleteFile(oldProofId)

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    await createNotifications(admins.map((admin) => ({
      userId: admin._id, titleAr: 'إثبات دفع تجديد مرفوع',
      bodyAr: 'رفع الطالب إثبات الدفع — يرجى مراجعة طلب التجديد',
      type: 'renewal', relatedId: request._id, actionUrl: '/admin/subscriptions/renewals',
    })))

    sendSuccess(res, { paymentProofId: request.paymentProofId }, 'تم رفع إثبات الدفع بنجاح')
  } catch (err) { next(err) }
}

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await SubscriptionRenewalRequest.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('requestedPackageId', 'nameAr descriptionAr price sessionsPerMonth')
      .populate('requestedTeacherId', 'firstNameAr lastNameAr avatar')
      .populate('resultingSubscriptionId', 'startDate endDate status')
    sendSuccess(res, requests)
  } catch (err) { next(err) }
}

exports.cancelMyRequest = async (req, res, next) => {
  try {
    const request = await SubscriptionRenewalRequest.findOne({ _id: req.params.id, studentId: req.user._id })
    if (!request) return sendError(res, 'الطلب غير موجود', 404)
    if (!['pending', 'under_review'].includes(request.status)) return sendError(res, 'لا يمكن إلغاء هذا الطلب في حالته الحالية', 400)
    request.status = 'cancelled'
    request.cancelledBy = req.user._id
    request.cancelledAt = new Date()
    request.cancelReason = req.body.reason
    await request.save()
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'renewal.cancel', entity: 'SubscriptionRenewalRequest', entityId: request._id, ip: req.ip })
    sendSuccess(res, request, 'تم إلغاء طلب التجديد')
  } catch (err) { next(err) }
}

// ── Admin ────────────────────────────────────────────────────────────────────

exports.getAllRequests = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    // Used by the unified student profile's "renewal history" section —
    // validated (not trusted raw) the same way admin.controller.js guards
    // every other query-string-derived Mongo filter value.
    if (req.query.studentId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.studentId)) return sendError(res, 'معرّف الطالب غير صالح', 400)
      filter.studentId = req.query.studentId
    }
    const [data, total] = await Promise.all([
      SubscriptionRenewalRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('studentId', 'firstNameAr lastNameAr email phone avatar')
        .populate('requestedPackageId', 'nameAr price sessionsPerMonth durationDays')
        .populate('requestedTeacherId', 'firstNameAr lastNameAr')
        .populate('currentSubscriptionId', 'teacherId endDate packageNameAr')
        .populate('reviewedBy', 'firstNameAr lastNameAr'),
      SubscriptionRenewalRequest.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) { next(err) }
}

exports.getPendingCount = async (req, res, next) => {
  try {
    const count = await SubscriptionRenewalRequest.countDocuments({ status: { $in: ['pending', 'under_review'] } })
    sendSuccess(res, { count })
  } catch (err) { next(err) }
}

exports.getRequest = async (req, res, next) => {
  try {
    const request = await SubscriptionRenewalRequest.findById(req.params.id)
      .populate('studentId', 'firstNameAr lastNameAr email phone avatar')
      .populate('requestedPackageId', 'nameAr price sessionsPerMonth durationDays')
      .populate('requestedTeacherId', 'firstNameAr lastNameAr')
      .populate('currentSubscriptionId')
      .populate('reviewedBy', 'firstNameAr lastNameAr')
      .populate('resultingSubscriptionId')
    if (!request) return sendError(res, 'الطلب غير موجود', 404)
    sendSuccess(res, request)
  } catch (err) { next(err) }
}

exports.reviewRequest = async (req, res, next) => {
  try {
    const { action, adminNotes } = req.body
    if (!['approved', 'rejected'].includes(action)) return sendError(res, 'الإجراء غير صالح', 400)

    const request = await SubscriptionRenewalRequest.findById(req.params.id)
    if (!request) return sendError(res, 'الطلب غير موجود', 404)
    if (!['pending', 'under_review'].includes(request.status)) return sendError(res, 'تم البت في هذا الطلب مسبقاً', 400)

    if (action === 'rejected') {
      request.status = 'rejected'
      request.adminNotes = adminNotes
      request.reviewedBy = req.user._id
      request.reviewedAt = new Date()
      await request.save()

      await createNotification({
        userId: request.studentId, titleAr: 'طلب التجديد — يحتاج مراجعة',
        bodyAr: adminNotes || 'تم رفض طلب التجديد. يرجى التواصل مع الإدارة للاستفسار.',
        type: 'renewal', priority: 'medium', relatedId: request._id, actionUrl: '/student/subscription',
      })
      logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'renewal.rejected', entity: 'SubscriptionRenewalRequest', entityId: request._id, ip: req.ip })
      await request.populate(['requestedPackageId', 'studentId', 'reviewedBy'])
      return sendSuccess(res, request, 'تم رفض الطلب')
    }

    request.adminNotes = adminNotes
    let result
    try {
      result = await renewalService.executeRenewal(request._id, { actorId: req.user._id })
    } catch (err) {
      if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
      throw err
    }
    await result.request.populate(['requestedPackageId', 'studentId', 'requestedTeacherId', 'reviewedBy', 'resultingSubscriptionId'])

    await createNotification({
      userId: request.studentId, titleAr: 'تمت الموافقة على تجديد اشتراكك',
      bodyAr: `تمت الموافقة على تجديد باقتك وإضافة الحصص الجديدة إلى رصيدك.`,
      type: 'renewal', priority: 'high', relatedId: request._id, actionUrl: '/student/subscription',
    })
    if (result.transfer) {
      await createNotification({
        userId: result.subscription.teacherId, titleAr: 'طالب جديد ضمن تجديد اشتراك',
        bodyAr: 'تم نقل طالب إليك ضمن تجديد اشتراكه.', type: 'renewal', priority: 'medium',
        relatedId: request._id, actionUrl: '/teacher/students',
      })
    }
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'renewal.approved',
      entity: 'SubscriptionRenewalRequest', entityId: request._id,
      changes: { resultingSubscriptionId: result.subscription._id, teacherChanged: !!result.transfer }, ip: req.ip,
    })
    sendSuccess(res, result.request, 'تمت الموافقة وتجديد الاشتراك بنجاح')
  } catch (err) { next(err) }
}

const EnrollmentRequest = require('../models/EnrollmentRequest')
const Subscription = require('../models/Subscription')
const Package = require('../models/Package')
const User = require('../models/User')
const { createNotification, createNotifications } = require('../services/notification.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')
const { logAction } = require('../services/audit.service')
const path = require('path')

// Student: Submit enrollment request
exports.submitRequest = async (req, res, next) => {
  try {
    const { packageId, paymentMethod, paymentReference, studentNotes } = req.body
    const studentId = req.user._id

    const pkg = await Package.findById(packageId)
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)
    if (!pkg.isActive) return sendError(res, 'هذه الباقة غير متاحة حالياً', 400)

    // Only one pending or under_review request at a time
    const existing = await EnrollmentRequest.findOne({
      studentId,
      status: { $in: ['pending', 'under_review'] },
    })
    if (existing) return sendError(res, 'لديك طلب تسجيل قيد المراجعة بالفعل', 400)

    const request = await EnrollmentRequest.create({
      studentId,
      packageId,
      amount: pkg.price,
      paymentMethod: paymentMethod || 'bank_transfer',
      paymentReference,
      studentNotes,
    })

    await request.populate(['packageId', 'studentId'])

    // Notify admins
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    const adminNotifs = admins.map(admin => ({
      userId: admin._id,
      titleAr: 'طلب تسجيل جديد',
      bodyAr: `قدّم ${req.user.firstNameAr} ${req.user.lastNameAr} طلب تسجيل في باقة "${pkg.nameAr}"`,
      type: 'enrollment',
      relatedId: request._id,
    }))
    if (adminNotifs.length) await createNotifications(adminNotifs)

    sendSuccess(res, request, 'تم إرسال طلب التسجيل بنجاح', 201)
  } catch (err) {
    next(err)
  }
}

// Student: Upload payment proof for their request
exports.uploadPaymentProof = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'لم يتم رفع أي ملف', 400)

    const request = await EnrollmentRequest.findOne({
      _id: req.params.id,
      studentId: req.user._id,
    })
    if (!request) return sendError(res, 'الطلب غير موجود', 404)
    if (!['pending', 'under_review'].includes(request.status)) {
      return sendError(res, 'لا يمكن تحديث هذا الطلب', 400)
    }

    const fileUrl = `/uploads/payment-proofs/${req.file.filename}`
    request.paymentProofUrl = fileUrl
    if (request.status === 'pending') request.status = 'under_review'
    await request.save()

    // Notify admins of proof upload
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    const notifs = admins.map(admin => ({
      userId: admin._id,
      titleAr: 'إثبات دفع مرفوع',
      bodyAr: `رفع الطالب إثبات الدفع — يرجى مراجعة طلب التسجيل`,
      type: 'enrollment',
      relatedId: request._id,
    }))
    if (notifs.length) await createNotifications(notifs)

    sendSuccess(res, { paymentProofUrl: fileUrl }, 'تم رفع إثبات الدفع بنجاح')
  } catch (err) {
    next(err)
  }
}

// Student: Get my enrollment requests
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await EnrollmentRequest.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('packageId', 'nameAr descriptionAr price sessionsPerMonth')
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, requests)
  } catch (err) {
    next(err)
  }
}

// Admin: Get all enrollment requests
exports.getAllRequests = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const [data, total] = await Promise.all([
      EnrollmentRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'firstNameAr lastNameAr email phone avatar')
        .populate('packageId', 'nameAr price sessionsPerMonth durationDays')
        .populate('teacherId', 'firstNameAr lastNameAr')
        .populate('reviewedBy', 'firstNameAr lastNameAr'),
      EnrollmentRequest.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) {
    next(err)
  }
}

// Admin: Get single request
exports.getRequest = async (req, res, next) => {
  try {
    const request = await EnrollmentRequest.findById(req.params.id)
      .populate('studentId', 'firstNameAr lastNameAr email phone avatar')
      .populate('packageId', 'nameAr price sessionsPerMonth durationDays')
      .populate('teacherId', 'firstNameAr lastNameAr')
      .populate('reviewedBy', 'firstNameAr lastNameAr')
    if (!request) return sendError(res, 'الطلب غير موجود', 404)
    sendSuccess(res, request)
  } catch (err) {
    next(err)
  }
}

// Admin: Approve or reject an enrollment request
exports.reviewRequest = async (req, res, next) => {
  try {
    const { action, adminNotes, teacherId, levelId, groupName, startDate } = req.body
    if (!['approved', 'rejected'].includes(action)) {
      return sendError(res, 'الإجراء غير صالح', 400)
    }

    const request = await EnrollmentRequest.findById(req.params.id)
      .populate('packageId')
      .populate('studentId', 'firstNameAr lastNameAr _id')
    if (!request) return sendError(res, 'الطلب غير موجود', 404)
    if (!['pending', 'under_review'].includes(request.status)) {
      return sendError(res, 'تم البت في هذا الطلب مسبقاً', 400)
    }

    request.status = action
    request.adminNotes = adminNotes
    request.reviewedBy = req.user._id
    request.reviewedAt = new Date()

    if (action === 'approved') {
      if (!teacherId) return sendError(res, 'يجب تحديد المعلم عند الموافقة', 400)

      request.teacherId = teacherId
      request.levelId = levelId
      request.groupName = groupName

      const pkg = request.packageId
      const start = startDate ? new Date(startDate) : new Date()
      const end = new Date(start.getTime() + (pkg.durationDays || 30) * 24 * 60 * 60 * 1000)

      const subscription = await Subscription.create({
        studentId: request.studentId._id,
        packageId: pkg._id,
        packageNameAr: pkg.nameAr,
        teacherId,
        startDate: start,
        endDate: end,
        sessionsRemaining: pkg.sessionsPerMonth,
        totalSessions: pkg.sessionsPerMonth,
        amountPaid: request.amount,
        status: 'active',
        notes: adminNotes,
        createdBy: req.user._id,
      })

      request.subscriptionId = subscription._id

      // Notify student: approved
      await createNotification({
        userId: request.studentId._id,
        titleAr: 'تمت الموافقة على طلب تسجيلك',
        bodyAr: `تمت الموافقة على طلبك وتم تفعيل باقة "${pkg.nameAr}". يمكنك الآن الوصول إلى حصصك.`,
        type: 'enrollment',
        priority: 'high',
        relatedId: request._id,
      })

      // Notify teacher: new student assigned
      await createNotification({
        userId: teacherId,
        titleAr: 'تم تعيين طالب جديد',
        bodyAr: `تم تعيين الطالب ${request.studentId.firstNameAr} ${request.studentId.lastNameAr} إليك. يرجى جدولة أول حصة.`,
        type: 'enrollment',
        priority: 'high',
        relatedId: request._id,
      })
    } else {
      // Notify student: rejected
      await createNotification({
        userId: request.studentId._id,
        titleAr: 'طلب التسجيل — يحتاج مراجعة',
        bodyAr: adminNotes || 'تم رفض طلبك. يرجى التواصل مع الإدارة للاستفسار.',
        type: 'enrollment',
        priority: 'medium',
        relatedId: request._id,
      })
    }

    await request.save()
    await request.populate(['packageId', 'studentId', 'teacherId', 'reviewedBy'])

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: `enrollment.${action}`,
      entity: 'EnrollmentRequest', entityId: request._id,
      changes: { action, teacherId: request.teacherId, subscriptionId: request.subscriptionId }, ip: req.ip,
    })

    sendSuccess(res, request, action === 'approved' ? 'تمت الموافقة وتفعيل الاشتراك' : 'تم رفض الطلب')
  } catch (err) {
    next(err)
  }
}

// Admin: Get pending count (for sidebar badge)
exports.getPendingCount = async (req, res, next) => {
  try {
    const count = await EnrollmentRequest.countDocuments({ status: { $in: ['pending', 'under_review'] } })
    sendSuccess(res, { count })
  } catch (err) {
    next(err)
  }
}

const Subscription = require('../models/Subscription')
const Package = require('../models/Package')
const Notification = require('../models/Notification')
const User = require('../models/User')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination, buildSearchFilter } = require('../utils/pagination')
const { resolveDatePreset } = require('../utils/datePresets')
const { logAction } = require('../services/audit.service')
const walletService = require('../services/wallet.service')
const { createSubscriptionWithOpeningBalance } = require('../services/subscription.service')

exports.getMySubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ studentId: req.user._id, status: 'active' })
      .populate('packageId', 'nameAr descriptionAr sessionsPerMonth')
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, sub)
  } catch (err) {
    next(err)
  }
}

exports.createSubscription = async (req, res, next) => {
  try {
    const { studentId, packageId, teacherId, startDate, notes, lessonsUsed, lessonsRemaining } = req.body

    let result
    try {
      result = await createSubscriptionWithOpeningBalance({
        studentId, packageId, teacherId, startDate, notes, lessonsUsed, lessonsRemaining,
        actorId: req.user._id, actorRole: 'admin',
      })
    } catch (err) {
      if (err.status) return sendError(res, err.message, err.status)
      throw err
    }
    const { subscription: sub, package: pkg, used, remaining } = result

    await sub.populate(['packageId', 'studentId', 'teacherId'])
    await Notification.create({ userId: studentId, titleAr: 'تم تفعيل الاشتراك', bodyAr: `تم تفعيل باقة "${pkg.nameAr}"`, type: 'subscription' })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'subscription.create',
      entity: 'Subscription', entityId: sub._id,
      changes: { studentId, teacherId, packageId, lessonsUsedAtOpening: used, lessonsRemainingAtOpening: remaining },
      ip: req.ip,
    })

    sendSuccess(res, sub, 'تم إنشاء الاشتراك', 201)
  } catch (err) {
    next(err)
  }
}

// Renew an existing subscription: creates a NEW billing-cycle Subscription
// document (never mutates or zeroes the old one) and credits the wallet
// additively — existing remaining lessons and full transaction history are
// preserved, satisfying "renewal must merge, not reset."
exports.renewSubscription = async (req, res, next) => {
  try {
    const existing = await Subscription.findById(req.params.id).populate('packageId')
    if (!existing) return sendError(res, 'الاشتراك غير موجود', 404)

    const packageId = req.body.packageId || existing.packageId._id
    const pkg = req.body.packageId ? await Package.findById(packageId) : existing.packageId
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)

    const start = req.body.startDate ? new Date(req.body.startDate) : new Date()
    const end = new Date(start.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000)

    const renewed = await Subscription.create({
      studentId: existing.studentId, packageId: pkg._id, packageNameAr: pkg.nameAr,
      teacherId: req.body.teacherId || existing.teacherId,
      startDate: start, endDate: end, billingDate: start, renewalDate: end,
      sessionsRemaining: 0, totalSessions: 0, // wallet-mirrored below, not a fresh grant on the OLD doc
      amountPaid: pkg.price, notes: req.body.notes,
      createdBy: req.user._id, renewedFromSubscriptionId: existing._id,
      status: 'active',
    })
    existing.renewsIntoSubscriptionId = renewed._id
    await existing.save()

    const { transaction } = await walletService.applyTransaction({
      studentId: existing.studentId, type: 'renewal', amount: pkg.sessionsPerMonth,
      idempotencyKey: `subscription:${renewed._id}:renew`,
      reason: `تجديد باقة "${pkg.nameAr}"`,
      relatedSubscriptionId: renewed._id, performedByRole: 'admin', performedBy: req.user._id,
    })
    renewed.walletTransactionId = transaction._id
    await renewed.save()
    await renewed.populate(['packageId', 'studentId', 'teacherId'])

    await Notification.create({
      userId: existing.studentId, titleAr: 'تم تجديد الاشتراك',
      bodyAr: `تم تجديد باقتك "${pkg.nameAr}" وإضافة الحصص الجديدة إلى رصيدك الحالي`, type: 'subscription',
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'subscription.renew',
      entity: 'Subscription', entityId: renewed._id,
      changes: { renewedFrom: existing._id, packageId: pkg._id }, ip: req.ip,
    })

    sendSuccess(res, renewed, 'تم تجديد الاشتراك بنجاح', 201)
  } catch (err) {
    next(err)
  }
}

exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    if (req.query.preset) {
      const range = resolveDatePreset(req.query.preset, req.query.startDate, req.query.endDate)
      filter.createdAt = { $gte: range.start, $lte: range.end }
    } else if (req.query.startDate && req.query.endDate) {
      const start = new Date(req.query.startDate); start.setHours(0, 0, 0, 0)
      const end = new Date(req.query.endDate); end.setHours(23, 59, 59, 999)
      filter.createdAt = { $gte: start, $lte: end }
    }

    if (req.query.search) {
      // Subscriptions have no searchable text of their own — resolve the
      // student-name/email search against User first, then filter by id.
      const studentFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'email'])
      const matchedStudents = await User.find({ role: 'student', ...studentFilter }).select('_id')
      filter.studentId = { $in: matchedStudents.map(s => s._id) }
    }
    const [data, total] = await Promise.all([
      Subscription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('studentId', 'firstNameAr lastNameAr avatar')
        .populate('teacherId', 'firstNameAr lastNameAr')
        .populate('packageId', 'nameAr price sessionsPerMonth'),
      Subscription.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) {
    next(err)
  }
}

// NOTE: sessionsRemaining/totalSessions are intentionally NOT in the allow-list
// below — they are a deprecated, wallet.service-maintained mirror (see
// models/Subscription.js). Manual lesson-balance adjustments now go through
// POST /api/wallet/:studentId/adjust, which creates an auditable
// LessonTransaction instead of silently overwriting a number.
exports.updateSubscription = async (req, res, next) => {
  try {
    const allowed = ['status', 'endDate', 'teacherId', 'notes', 'amountPaid']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const sub = await Subscription.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('studentId', 'firstNameAr lastNameAr')
      .populate('teacherId', 'firstNameAr lastNameAr')
      .populate('packageId', 'nameAr price')
    if (!sub) return sendError(res, 'الاشتراك غير موجود', 404)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'subscription.update',
      entity: 'Subscription', entityId: sub._id, changes: updates, ip: req.ip,
    })

    sendSuccess(res, sub, 'تم تحديث الاشتراك')
  } catch (err) {
    next(err)
  }
}


const Subscription = require('../models/Subscription')
const Package = require('../models/Package')
const Notification = require('../models/Notification')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')
const { logAction } = require('../services/audit.service')

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
    const { studentId, packageId, teacherId, startDate, notes } = req.body
    const pkg = await Package.findById(packageId)
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)
    const start = startDate ? new Date(startDate) : new Date()
    const end = new Date(start.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000)
    const sub = await Subscription.create({
      studentId, packageId, packageNameAr: pkg.nameAr, teacherId, startDate: start, endDate: end,
      sessionsRemaining: pkg.sessionsPerMonth, totalSessions: pkg.sessionsPerMonth,
      amountPaid: pkg.price, notes, createdBy: req.user._id,
    })
    await sub.populate(['packageId', 'studentId', 'teacherId'])
    await Notification.create({ userId: studentId, titleAr: 'تم تفعيل الاشتراك', bodyAr: `تم تفعيل باقة "${pkg.nameAr}"`, type: 'subscription' })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'subscription.create',
      entity: 'Subscription', entityId: sub._id, changes: { studentId, teacherId, packageId }, ip: req.ip,
    })

    sendSuccess(res, sub, 'تم إنشاء الاشتراك', 201)
  } catch (err) {
    next(err)
  }
}

exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status
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

exports.updateSubscription = async (req, res, next) => {
  try {
    const allowed = ['status', 'sessionsRemaining', 'totalSessions', 'endDate', 'teacherId', 'notes', 'amountPaid']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    if (updates.sessionsRemaining !== undefined) {
      updates.sessionsRemaining = Math.max(0, Number(updates.sessionsRemaining))
    }
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

exports.createSubscriptionExtra = async (req, res, next) => {
  try {
    const { studentId, packageId, teacherId, startDate, notes, sessionsRemaining, amountPaid } = req.body
    const pkg = await Package.findById(packageId)
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)
    const start = startDate ? new Date(startDate) : new Date()
    const end = new Date(start.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000)
    const sub = await Subscription.create({
      studentId, packageId, packageNameAr: pkg.nameAr, teacherId, startDate: start, endDate: end,
      sessionsRemaining: sessionsRemaining !== undefined ? Number(sessionsRemaining) : pkg.sessionsPerMonth,
      totalSessions: pkg.sessionsPerMonth,
      amountPaid: amountPaid !== undefined ? Number(amountPaid) : pkg.price,
      notes, createdBy: req.user._id,
    })
    await sub.populate(['packageId', 'studentId', 'teacherId'])
    await Notification.create({ userId: studentId, titleAr: 'تم تفعيل الاشتراك', bodyAr: `تم تفعيل باقة "${pkg.nameAr}"`, type: 'subscription' })
    sendSuccess(res, sub, 'تم إنشاء الاشتراك', 201)
  } catch (err) {
    next(err)
  }
}

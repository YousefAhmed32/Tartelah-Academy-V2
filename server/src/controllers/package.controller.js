const Package = require('../models/Package')
const Subscription = require('../models/Subscription')
const { sendSuccess, sendError } = require('../utils/response')

exports.getAll = async (req, res, next) => {
  try {
    const filter = { isActive: true }
    if (req.query.landing === 'true') {
      filter.showOnLandingPage = { $ne: false }
    }
    const packages = await Package.find(filter).sort({ sortOrder: 1, price: 1 })
    sendSuccess(res, packages)
  } catch (err) {
    next(err)
  }
}

exports.getAllAdmin = async (req, res, next) => {
  try {
    const packages = await Package.find().sort({ sortOrder: 1, price: 1 })
    sendSuccess(res, packages)
  } catch (err) {
    next(err)
  }
}

exports.create = async (req, res, next) => {
  try {
    const pkg = await Package.create(req.body)
    sendSuccess(res, pkg, 'تم إنشاء الباقة بنجاح', 201)
  } catch (err) {
    next(err)
  }
}

exports.update = async (req, res, next) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)
    sendSuccess(res, pkg, 'تم تحديث الباقة بنجاح')
  } catch (err) {
    next(err)
  }
}

exports.deletePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id)
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)

    // Check if any active/pending subscriptions are currently linked to this package
    const activeSubsCount = await Subscription.countDocuments({
      packageId: req.params.id,
      status: { $in: ['active', 'paused', 'pending'] }
    })

    if (activeSubsCount > 0) {
      return sendError(
        res,
        `لا يمكن حذف هذه الباقة لوجود ${activeSubsCount} اشتراك مرتبط بها حالياً. يمكنك إيقاف تفعيلها أو إخفائها من الرئيسية بدلاً من الحذف.`,
        400
      )
    }

    await Package.findByIdAndDelete(req.params.id)
    sendSuccess(res, null, 'تم حذف الباقة بنجاح')
  } catch (err) {
    next(err)
  }
}


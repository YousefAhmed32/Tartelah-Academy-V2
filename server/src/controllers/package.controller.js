const Package = require('../models/Package')
const { sendSuccess, sendError } = require('../utils/response')

exports.getAll = async (req, res, next) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({ sortOrder: 1, price: 1 })
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
    sendSuccess(res, pkg, 'تم إنشاء الباقة', 201)
  } catch (err) {
    next(err)
  }
}

exports.update = async (req, res, next) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!pkg) return sendError(res, 'الباقة غير موجودة', 404)
    sendSuccess(res, pkg, 'تم تحديث الباقة')
  } catch (err) {
    next(err)
  }
}

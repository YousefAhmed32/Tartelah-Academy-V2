const Course = require('../models/Course')
const { sendSuccess, sendError } = require('../utils/response')

exports.getAll = async (req, res, next) => {
  try {
    const filter = {}
    if (req.query.level) filter.level = req.query.level
    if (req.query.ageGroup) filter.ageGroup = req.query.ageGroup
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true'
    const courses = await Course.find(filter).sort({ createdAt: -1 })
    sendSuccess(res, courses)
  } catch (err) {
    next(err)
  }
}

exports.create = async (req, res, next) => {
  try {
    const course = await Course.create(req.body)
    sendSuccess(res, course, 'تم إنشاء المقرر', 201)
  } catch (err) {
    next(err)
  }
}

exports.update = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!course) return sendError(res, 'المقرر غير موجود', 404)
    sendSuccess(res, course, 'تم تحديث المقرر')
  } catch (err) {
    next(err)
  }
}

exports.remove = async (req, res, next) => {
  try {
    await Course.findByIdAndDelete(req.params.id)
    sendSuccess(res, null, 'تم حذف المقرر')
  } catch (err) {
    next(err)
  }
}

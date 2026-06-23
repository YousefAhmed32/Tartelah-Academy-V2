const Testimonial = require('../models/Testimonial')
const FAQ = require('../models/FAQ')
const { sendSuccess, sendError } = require('../utils/response')

exports.getTestimonials = async (req, res, next) => {
  try {
    const items = await Testimonial.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 })
    sendSuccess(res, items)
  } catch (err) {
    next(err)
  }
}

exports.createTestimonial = async (req, res, next) => {
  try {
    const item = await Testimonial.create(req.body)
    sendSuccess(res, item, 'تم الإضافة', 201)
  } catch (err) {
    next(err)
  }
}

exports.deleteTestimonial = async (req, res, next) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id)
    sendSuccess(res, null, 'تم الحذف')
  } catch (err) {
    next(err)
  }
}

exports.getFAQs = async (req, res, next) => {
  try {
    const items = await FAQ.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 })
    sendSuccess(res, items)
  } catch (err) {
    next(err)
  }
}

exports.createFAQ = async (req, res, next) => {
  try {
    const item = await FAQ.create(req.body)
    sendSuccess(res, item, 'تم الإضافة', 201)
  } catch (err) {
    next(err)
  }
}

exports.deleteFAQ = async (req, res, next) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id)
    sendSuccess(res, null, 'تم الحذف')
  } catch (err) {
    next(err)
  }
}

exports.getSettings = async (req, res, next) => {
  sendSuccess(res, { platform: 'ترتيلة أونلاين', version: '1.0.0' })
}

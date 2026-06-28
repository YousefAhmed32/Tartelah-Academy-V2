const Testimonial = require('../models/Testimonial')
const FAQ = require('../models/FAQ')
const AcademySettings = require('../models/AcademySettings')
const ContactMessage = require('../models/ContactMessage')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')

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
  } catch (err) { next(err) }
}

// ─── Settings ───────────────────────────────────────────────────────────────

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await AcademySettings.findOne()
    if (!settings) settings = await AcademySettings.create({})
    sendSuccess(res, settings)
  } catch (err) { next(err) }
}

const SETTINGS_ALLOWED = [
  'academyNameAr', 'academyNameEn', 'taglineAr',
  'phone', 'whatsapp', 'email', 'address',
  'facebook', 'instagram', 'twitter', 'youtube', 'linkedin',
  'workingHours', 'supportText', 'emergencyContact',
  'googleMapsUrl', 'googleMapsEmbed',
  'footerDescription', 'footerCopyright',
  'privacyPolicyUrl', 'termsUrl', 'cookiesPolicyUrl',
  'newsletterEnabled', 'newsletterText',
  'zoomClientId', 'googleMeetEnabled',
  'smtpHost', 'smtpPort', 'smtpUser',
  'maintenanceMode', 'maintenanceMessage',
]

exports.updateSettings = async (req, res, next) => {
  try {
    const updates = {}
    SETTINGS_ALLOWED.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const settings = await AcademySettings.findOneAndUpdate({}, updates, { new: true, upsert: true })
    sendSuccess(res, settings, 'تم حفظ الإعدادات')
  } catch (err) { next(err) }
}

// ─── Contact Form (public) ───────────────────────────────────────────────────

exports.submitContactForm = async (req, res, next) => {
  try {
    const { name, email, phone, country, subject, message, preferredContact } = req.body
    if (!name || !email || !message) return sendError(res, 'الاسم والبريد الإلكتروني والرسالة مطلوبة', 400)

    const msg = await ContactMessage.create({
      name, email, phone, country, subject, message,
      preferredContact: preferredContact || 'email',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    try {
      const User = require('../models/User')
      const { createNotification } = require('../services/notification.service')
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
      const notifBody = `من: ${name} (${email})\nالموضوع: ${subject || 'استفسار عام'}\n${message}`
      await Promise.all(admins.map(a => createNotification({
        userId: a._id,
        titleAr: `رسالة جديدة من الموقع: ${name}`,
        bodyAr: notifBody.slice(0, 300),
        type: 'system', priority: 'medium',
      })))
    } catch (_) { /* non-critical */ }

    sendSuccess(res, { id: msg._id }, 'تم إرسال رسالتك، سنتواصل معك قريباً')
  } catch (err) { next(err) }
}

// ─── Contact Messages (Admin) ────────────────────────────────────────────────

exports.getContactMessages = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req)
    const { status, search } = req.query

    const filter = {}
    if (status && status !== 'all') filter.status = status
    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [{ name: rx }, { email: rx }, { subject: rx }, { message: rx }]
    }

    const [docs, total, unreadCount] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ status: 'new' }),
    ])

    sendPaginated(res, docs, total, page, limit, { unreadCount })
  } catch (err) { next(err) }
}

exports.getContactMessage = async (req, res, next) => {
  try {
    const msg = await ContactMessage.findById(req.params.id)
    if (!msg) return sendError(res, 'الرسالة غير موجودة', 404)
    if (msg.status === 'new') {
      msg.status = 'read'
      msg.readAt = new Date()
      await msg.save()
    }
    sendSuccess(res, msg)
  } catch (err) { next(err) }
}

exports.updateContactMessage = async (req, res, next) => {
  try {
    const allowed = ['status', 'adminNotes']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    if (req.body.status === 'replied') updates.repliedAt = new Date()
    if (req.body.status === 'read')    updates.readAt    = new Date()

    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!msg) return sendError(res, 'الرسالة غير موجودة', 404)
    sendSuccess(res, msg, 'تم التحديث')
  } catch (err) { next(err) }
}

exports.deleteContactMessage = async (req, res, next) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id)
    sendSuccess(res, null, 'تم الحذف')
  } catch (err) { next(err) }
}

exports.getContactStats = async (req, res, next) => {
  try {
    const [total, newCount, replied, archived] = await Promise.all([
      ContactMessage.countDocuments(),
      ContactMessage.countDocuments({ status: 'new' }),
      ContactMessage.countDocuments({ status: 'replied' }),
      ContactMessage.countDocuments({ status: 'archived' }),
    ])
    sendSuccess(res, { total, new: newCount, replied, archived })
  } catch (err) { next(err) }
}

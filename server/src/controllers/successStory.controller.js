const SuccessStory = require('../models/SuccessStory')
const { sendSuccess, sendError } = require('../utils/response')

const ROLES = ['teacher', 'student', 'achievement']

async function getOrCreate() {
  let doc = await SuccessStory.findOne()
  if (!doc) doc = await SuccessStory.create({})
  return doc
}

// ─── Public ───────────────────────────────────────────────────────────────

exports.getPublic = async (req, res, next) => {
  try {
    // .lean() — this is a read-only public response; skip Mongoose document
    // hydration/getters and hand back the plain object directly.
    const doc = await SuccessStory.findOne().lean()
    if (!doc || !doc.isActive) return sendSuccess(res, null)
    sendSuccess(res, doc)
  } catch (err) { next(err) }
}

// ─── Admin ────────────────────────────────────────────────────────────────

exports.getAdmin = async (req, res, next) => {
  try {
    const doc = await getOrCreate()
    sendSuccess(res, doc)
  } catch (err) { next(err) }
}

const CARD_FIELDS = ['nameAr', 'titleAr', 'descriptionAr', 'badgeAr', 'ctaText', 'ctaLink', 'order', 'isActive']
const BANNER_FIELDS = ['titleAr', 'subtitleAr', 'buttonText', 'buttonLink', 'isActive']

exports.updateConfig = async (req, res, next) => {
  try {
    const doc = await getOrCreate()
    const { displayMode, isActive, cards, banner } = req.body

    if (displayMode !== undefined) {
      if (!['cards', 'banner'].includes(displayMode)) return sendError(res, 'وضع عرض غير صالح', 400)
      doc.displayMode = displayMode
    }
    if (isActive !== undefined) doc.isActive = !!isActive

    if (Array.isArray(cards)) {
      cards.forEach(update => {
        const target = doc.cards.find(c => c.role === update.role)
        if (!target) return
        CARD_FIELDS.forEach(f => { if (update[f] !== undefined) target[f] = update[f] })
      })
    }

    if (banner && typeof banner === 'object') {
      BANNER_FIELDS.forEach(f => { if (banner[f] !== undefined) doc.banner[f] = banner[f] })
    }

    await doc.save()
    sendSuccess(res, doc, 'تم حفظ الإعدادات')
  } catch (err) { next(err) }
}

exports.uploadCardImage = async (req, res, next) => {
  try {
    const { role } = req.params
    if (!ROLES.includes(role)) return sendError(res, 'دور غير صالح', 400)
    if (!req.file) return sendError(res, 'لم يتم رفع أي صورة', 400)

    const doc = await getOrCreate()
    const target = doc.cards.find(c => c.role === role)
    if (!target) return sendError(res, 'البطاقة غير موجودة', 404)

    target.image = `/uploads/success-stories/${req.file.filename}`
    await doc.save()
    sendSuccess(res, doc, 'تم رفع الصورة')
  } catch (err) { next(err) }
}

exports.removeCardImage = async (req, res, next) => {
  try {
    const { role } = req.params
    if (!ROLES.includes(role)) return sendError(res, 'دور غير صالح', 400)

    const doc = await getOrCreate()
    const target = doc.cards.find(c => c.role === role)
    if (!target) return sendError(res, 'البطاقة غير موجودة', 404)

    target.image = undefined
    await doc.save()
    sendSuccess(res, doc, 'تم حذف الصورة')
  } catch (err) { next(err) }
}

exports.uploadBannerImage = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'لم يتم رفع أي صورة', 400)

    const doc = await getOrCreate()
    doc.banner.image = `/uploads/success-stories/${req.file.filename}`
    await doc.save()
    sendSuccess(res, doc, 'تم رفع الصورة')
  } catch (err) { next(err) }
}

exports.removeBannerImage = async (req, res, next) => {
  try {
    const doc = await getOrCreate()
    doc.banner.image = undefined
    await doc.save()
    sendSuccess(res, doc, 'تم حذف الصورة')
  } catch (err) { next(err) }
}

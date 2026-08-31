// Dynamic teaching-subject/curriculum catalog endpoints. Public listing (GET
// /teaching-subjects) is unauthenticated, read-only, active-only — needed by
// public teacher-directory filters and any pre-login form; every mutating
// action requires 'curricula.manage' (or the Primary Admin bypass — see
// rbac.middleware.js). Business logic lives in services/teachingSubject.service.js.
const service = require('../services/teachingSubject.service')
const { sendSuccess, sendError } = require('../utils/response')

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, {
    ...(err.field ? { field: err.field } : {}),
    ...(err.existingId ? { existingId: err.existingId } : {}),
  })
  next(err)
}

// GET /teaching-subjects — public, active only. Small, bounded, cached list.
exports.listActive = async (req, res, next) => {
  try {
    const subjects = await service.listActive()
    sendSuccess(res, subjects)
  } catch (err) { next(err) }
}

// GET /admin/teaching-subjects — admin management screen: every subject,
// active and archived, so archived ones can be reviewed/unarchived.
exports.listAll = async (req, res, next) => {
  try {
    const subjects = await service.listAll()
    sendSuccess(res, subjects)
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { nameAr, nameEn } = req.body
    const { subject, created } = await service.createSubject({ nameAr, nameEn, actorId: req.user._id })
    sendSuccess(res, subject, created ? 'تم إنشاء المنهج' : 'المنهج موجود بالفعل — تم اختياره', created ? 201 : 200)
  } catch (err) { handleKnownError(err, res, next) }
}

exports.update = async (req, res, next) => {
  try {
    const { nameAr, nameEn } = req.body
    const subject = await service.updateSubject({ id: req.params.id, nameAr, nameEn, actorId: req.user._id })
    sendSuccess(res, subject, 'تم تحديث المنهج')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.archive = async (req, res, next) => {
  try {
    const subject = await service.setActive({ id: req.params.id, isActive: false, actorId: req.user._id })
    sendSuccess(res, subject, 'تمت أرشفة المنهج')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.unarchive = async (req, res, next) => {
  try {
    const subject = await service.setActive({ id: req.params.id, isActive: true, actorId: req.user._id })
    sendSuccess(res, subject, 'تمت إعادة تفعيل المنهج')
  } catch (err) { handleKnownError(err, res, next) }
}

exports.reorder = async (req, res, next) => {
  try {
    const { orderedIds } = req.body
    const subjects = await service.reorderSubjects({ orderedIds, actorId: req.user._id })
    sendSuccess(res, subjects, 'تم إعادة ترتيب المناهج')
  } catch (err) { handleKnownError(err, res, next) }
}

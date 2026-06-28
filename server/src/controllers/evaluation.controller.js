const Evaluation = require('../models/Evaluation')
const { createNotification } = require('../services/notification.service')
const { sendSuccess, sendError } = require('../utils/response')

exports.create = async (req, res, next) => {
  try {
    const teacherId = req.user._id
    const { studentId, type, score, notesAr, strengths, improvements, sessionId } = req.body
    const ev = await Evaluation.create({ studentId, teacherId, type, score, notesAr, strengths, improvements, sessionId })
    await ev.populate('studentId teacherId', 'firstNameAr lastNameAr avatar')
    await createNotification({
      userId: studentId,
      titleAr: 'تقييم جديد',
      bodyAr: `أضاف معلمك تقييماً جديداً بدرجة ${score}/10`,
      type: 'evaluation',
      priority: 'medium',
      relatedId: ev._id,
    })
    sendSuccess(res, ev, 'تم إضافة التقييم', 201)
  } catch (err) {
    next(err)
  }
}

exports.getStudentEvaluations = async (req, res, next) => {
  try {
    const evals = await Evaluation.find({ studentId: req.user._id, isSharedWithStudent: true })
      .sort({ createdAt: -1 })
      .populate('teacherId', 'firstNameAr lastNameAr')
    sendSuccess(res, evals)
  } catch (err) {
    next(err)
  }
}

exports.getTeacherEvaluations = async (req, res, next) => {
  try {
    const evals = await Evaluation.find({ teacherId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('studentId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, evals)
  } catch (err) {
    next(err)
  }
}

exports.updateEvaluation = async (req, res, next) => {
  try {
    const ev = await Evaluation.findById(req.params.id)
    if (!ev) return sendError(res, 'التقييم غير موجود', 404)
    const isAdmin = req.user.role === 'admin'
    if (!isAdmin && ev.teacherId.toString() !== req.user._id.toString()) return sendError(res, 'غير مصرح', 403)
    const allowed = ['score', 'notesAr', 'strengths', 'improvements', 'type', 'isSharedWithStudent']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const updated = await Evaluation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('studentId teacherId', 'firstNameAr lastNameAr')
    sendSuccess(res, updated, 'تم تحديث التقييم')
  } catch (err) {
    next(err)
  }
}

exports.deleteEvaluation = async (req, res, next) => {
  try {
    const ev = await Evaluation.findById(req.params.id)
    if (!ev) return sendError(res, 'التقييم غير موجود', 404)
    const isAdmin = req.user.role === 'admin'
    if (!isAdmin && ev.teacherId.toString() !== req.user._id.toString()) return sendError(res, 'غير مصرح', 403)
    await ev.deleteOne()
    sendSuccess(res, null, 'تم حذف التقييم')
  } catch (err) {
    next(err)
  }
}

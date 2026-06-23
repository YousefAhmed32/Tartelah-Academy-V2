const Evaluation = require('../models/Evaluation')
const Notification = require('../models/Notification')
const { sendSuccess, sendError } = require('../utils/response')

exports.create = async (req, res, next) => {
  try {
    const teacherId = req.user._id
    const { studentId, type, score, notesAr, strengths, improvements, sessionId } = req.body
    const ev = await Evaluation.create({ studentId, teacherId, type, score, notesAr, strengths, improvements, sessionId })
    await ev.populate('studentId teacherId', 'firstNameAr lastNameAr avatar')
    await Notification.create({
      userId: studentId,
      titleAr: 'تقييم جديد',
      bodyAr: `أضاف معلمك تقييماً جديداً بدرجة ${score}/10`,
      type: 'evaluation',
      data: { evaluationId: ev._id },
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

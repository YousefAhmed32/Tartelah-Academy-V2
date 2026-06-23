const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const { sendSuccess, sendError } = require('../utils/response')

exports.createMemorization = async (req, res, next) => {
  try {
    const { studentId, surahNumber, fromAyah, toAyah, quality, teacherNotes, sessionId } = req.body
    const rec = await Memorization.create({ studentId, teacherId: req.user._id, surahNumber, fromAyah, toAyah, quality, teacherNotes, sessionId })
    await rec.populate('studentId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, rec, 'تم تسجيل الحفظ', 201)
  } catch (err) {
    next(err)
  }
}

exports.createRevision = async (req, res, next) => {
  try {
    const { studentId, surahNumber, fromAyah, toAyah, quality, teacherNotes, sessionId } = req.body
    const rec = await Revision.create({ studentId, teacherId: req.user._id, surahNumber, fromAyah, toAyah, quality, teacherNotes, sessionId })
    await rec.populate('studentId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, rec, 'تم تسجيل المراجعة', 201)
  } catch (err) {
    next(err)
  }
}

exports.getStudentMemorization = async (req, res, next) => {
  try {
    const studentId = req.user.role === 'student' ? req.user._id : req.params.studentId
    const records = await Memorization.find({ studentId }).sort({ surahNumber: 1, fromAyah: 1 })
      .populate('teacherId', 'firstNameAr lastNameAr')
    sendSuccess(res, records)
  } catch (err) {
    next(err)
  }
}

exports.getStudentRevision = async (req, res, next) => {
  try {
    const studentId = req.user.role === 'student' ? req.user._id : req.params.studentId
    const records = await Revision.find({ studentId }).sort({ recordedAt: -1 })
      .populate('teacherId', 'firstNameAr lastNameAr')
    sendSuccess(res, records)
  } catch (err) {
    next(err)
  }
}

exports.getTeacherMemorization = async (req, res, next) => {
  try {
    const records = await Memorization.find({ teacherId: req.user._id }).sort({ recordedAt: -1 })
      .populate('studentId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, records)
  } catch (err) {
    next(err)
  }
}

exports.getTeacherRevision = async (req, res, next) => {
  try {
    const records = await Revision.find({ teacherId: req.user._id }).sort({ recordedAt: -1 })
      .populate('studentId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, records)
  } catch (err) {
    next(err)
  }
}

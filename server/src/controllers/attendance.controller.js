const Attendance = require('../models/Attendance')
const Session = require('../models/Session')
const { sendSuccess, sendError } = require('../utils/response')

exports.getTeacherAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find({ teacherId: req.user._id })
      .sort({ recordedAt: -1 })
      .limit(100)
      .populate('studentId', 'firstNameAr lastNameAr avatar')
      .populate('sessionId', 'titleAr scheduledAt')
    sendSuccess(res, records)
  } catch (err) {
    next(err)
  }
}

exports.updateAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, notes: req.body.notes },
      { new: true }
    )
    if (!record) return sendError(res, 'سجل الحضور غير موجود', 404)
    sendSuccess(res, record, 'تم تحديث سجل الحضور')
  } catch (err) {
    next(err)
  }
}

// Get attendance for a specific session
exports.getSessionAttendance = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.sessionId).select('studentId teacherId')
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    const record = await Attendance.findOne({
      sessionId: session._id,
      studentId: session.studentId,
    }).populate('studentId', 'firstNameAr lastNameAr avatar')

    sendSuccess(res, record || null)
  } catch (err) {
    next(err)
  }
}

// Create or update attendance for a specific session
exports.saveSessionAttendance = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.sessionId).select('studentId teacherId')
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    if (req.user.role === 'teacher' && session.teacherId.toString() !== req.user._id.toString()) {
      return sendError(res, 'غير مصرح', 403)
    }

    const { status, notes } = req.body
    if (!status) return sendError(res, 'status مطلوب', 400)

    const record = await Attendance.findOneAndUpdate(
      { sessionId: session._id, studentId: session.studentId },
      {
        sessionId: session._id,
        studentId: session.studentId,
        teacherId: session.teacherId,
        status,
        notes: notes || '',
        recordedAt: new Date(),
      },
      { upsert: true, new: true }
    ).populate('studentId', 'firstNameAr lastNameAr')

    sendSuccess(res, record, 'تم حفظ الحضور')
  } catch (err) {
    next(err)
  }
}

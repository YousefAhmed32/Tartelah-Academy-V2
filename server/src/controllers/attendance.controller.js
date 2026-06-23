const Attendance = require('../models/Attendance')
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

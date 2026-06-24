const Session = require('../models/Session')
const Attendance = require('../models/Attendance')
const Subscription = require('../models/Subscription')
const Notification = require('../models/Notification')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')

exports.createSession = async (req, res, next) => {
  try {
    const { studentId, titleAr, scheduledAt, durationMinutes, meetingLink, meetingProvider, notes, isMakeup } = req.body
    const teacherId = req.user._id
    const session = await Session.create({
      studentId, teacherId, titleAr, scheduledAt, durationMinutes,
      meetingLink, meetingProvider, notes,
      isMakeup: isMakeup || false,
      isException: true,
    })
    await session.populate(['studentId', 'teacherId'])
    await Notification.create({
      userId: studentId,
      titleAr: 'حصة جديدة مجدولة',
      bodyAr: `تم جدولة حصة "${titleAr}" في ${new Date(scheduledAt).toLocaleDateString('ar')}`,
      type: 'session',
      data: { sessionId: session._id },
    })
    sendSuccess(res, session, 'تمت جدولة الحصة بنجاح', 201)
  } catch (err) {
    next(err)
  }
}

exports.getSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('studentId', 'firstNameAr lastNameAr avatar email phone')
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    const attendance = await Attendance.findOne({ sessionId: session._id, studentId: session.studentId })
    sendSuccess(res, { ...session.toObject(), attendance: attendance || null })
  } catch (err) {
    next(err)
  }
}

exports.getUpcomingSessions = async (req, res, next) => {
  try {
    const userId = req.user._id
    const role = req.user.role
    const filter = { scheduledAt: { $gte: new Date() }, status: { $in: ['scheduled', 'ongoing'] } }
    if (role === 'student') filter.studentId = userId
    else if (role === 'teacher') filter.teacherId = userId
    const sessions = await Session.find(filter).sort({ scheduledAt: 1 }).limit(50)
      .populate('studentId teacherId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, sessions)
  } catch (err) {
    next(err)
  }
}

exports.getSessionHistory = async (req, res, next) => {
  try {
    const userId = req.user._id
    const role = req.user.role
    const { page, limit, skip } = getPagination(req.query)
    const filter = { scheduledAt: { $lt: new Date() } }
    if (role === 'student') filter.studentId = userId
    else if (role === 'teacher') filter.teacherId = userId
    const [sessions, total] = await Promise.all([
      Session.find(filter).sort({ scheduledAt: -1 }).skip(skip).limit(limit)
        .populate('studentId teacherId', 'firstNameAr lastNameAr avatar'),
      Session.countDocuments(filter),
    ])
    sendPaginated(res, sessions, total, page, limit)
  } catch (err) {
    next(err)
  }
}

exports.getTeacherSessionsByMonth = async (req, res, next) => {
  try {
    const { year, month, studentId } = req.query
    const y = parseInt(year) || new Date().getFullYear()
    const m = parseInt(month) || (new Date().getMonth() + 1)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59, 999)

    const filter = {
      teacherId: req.user._id,
      scheduledAt: { $gte: start, $lte: end },
    }
    if (studentId) filter.studentId = studentId

    const sessions = await Session.find(filter)
      .sort({ scheduledAt: 1 })
      .populate('studentId', 'firstNameAr lastNameAr avatar email')

    sendSuccess(res, sessions)
  } catch (err) {
    next(err)
  }
}

exports.completeSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (session.teacherId.toString() !== req.user._id.toString()) return sendError(res, 'غير مصرح', 403)
    session.status = 'completed'
    session.completedAt = new Date()
    await session.save()
    await Subscription.findOneAndUpdate(
      { studentId: session.studentId, status: 'active' },
      { $inc: { sessionsRemaining: -1 } }
    )
    // Only auto-create attendance as 'present' if not already recorded
    const existingAtt = await Attendance.findOne({ sessionId: session._id })
    if (!existingAtt) {
      await Attendance.create({
        sessionId: session._id,
        studentId: session.studentId,
        teacherId: session.teacherId,
        status: 'present',
        recordedAt: new Date(),
      })
    }
    sendSuccess(res, session, 'تم إكمال الحصة')
  } catch (err) {
    next(err)
  }
}

exports.cancelSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    session.status = 'cancelled'
    session.cancelledAt = new Date()
    session.cancelReason = req.body.reason || ''
    await session.save()

    await Notification.create({
      userId: session.studentId,
      titleAr: 'تم إلغاء الحصة',
      bodyAr: `تم إلغاء حصة "${session.titleAr}"${session.cancelReason ? ` — ${session.cancelReason}` : ''}`,
      type: 'session',
      data: { sessionId: session._id },
    })

    sendSuccess(res, session, 'تم إلغاء الحصة')
  } catch (err) {
    next(err)
  }
}

exports.rescheduleSession = async (req, res, next) => {
  try {
    const { newDate } = req.body
    if (!newDate) return sendError(res, 'التاريخ الجديد مطلوب', 400)
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (session.teacherId.toString() !== req.user._id.toString()) return sendError(res, 'غير مصرح', 403)
    session.rescheduledFrom = session.scheduledAt
    session.scheduledAt = new Date(newDate)
    session.status = 'scheduled'
    session.isException = true
    await session.save()

    await Notification.create({
      userId: session.studentId,
      titleAr: 'تم إعادة جدولة الحصة',
      bodyAr: `تم تغيير موعد حصة "${session.titleAr}" إلى ${new Date(newDate).toLocaleDateString('ar')}`,
      type: 'session',
      data: { sessionId: session._id },
    })

    sendSuccess(res, session, 'تم إعادة جدولة الحصة')
  } catch (err) {
    next(err)
  }
}

exports.getTeacherSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ teacherId: req.user._id })
      .sort({ scheduledAt: -1 })
      .limit(100)
      .populate('studentId', 'firstNameAr lastNameAr avatar')
    sendSuccess(res, sessions)
  } catch (err) {
    next(err)
  }
}

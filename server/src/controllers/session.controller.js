const Session = require('../models/Session')
const Attendance = require('../models/Attendance')
const Subscription = require('../models/Subscription')
const Notification = require('../models/Notification')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')

exports.createSession = async (req, res, next) => {
  try {
    const { studentId, titleAr, scheduledAt, durationMinutes, meetingLink, meetingProvider, notes } = req.body
    const teacherId = req.user._id
    const session = await Session.create({ studentId, teacherId, titleAr, scheduledAt, durationMinutes, meetingLink, meetingProvider, notes })
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

exports.getUpcomingSessions = async (req, res, next) => {
  try {
    const userId = req.user._id
    const role = req.user.role
    const filter = { scheduledAt: { $gte: new Date() }, status: { $in: ['scheduled', 'ongoing'] } }
    if (role === 'student') filter.studentId = userId
    else if (role === 'teacher') filter.teacherId = userId
    const sessions = await Session.find(filter).sort({ scheduledAt: 1 }).limit(50).populate('studentId teacherId', 'firstNameAr lastNameAr avatar')
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
      Session.find(filter).sort({ scheduledAt: -1 }).skip(skip).limit(limit).populate('studentId teacherId', 'firstNameAr lastNameAr avatar'),
      Session.countDocuments(filter),
    ])
    sendPaginated(res, sessions, total, page, limit)
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
    // Decrement sessionsRemaining in subscription
    await Subscription.findOneAndUpdate(
      { studentId: session.studentId, status: 'active' },
      { $inc: { sessionsRemaining: -1 } }
    )
    await Attendance.findOneAndUpdate(
      { sessionId: session._id },
      { sessionId: session._id, studentId: session.studentId, teacherId: session.teacherId, status: 'present' },
      { upsert: true, new: true }
    )
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
    sendSuccess(res, session, 'تم إلغاء الحصة')
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

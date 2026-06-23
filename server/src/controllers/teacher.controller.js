const Session = require('../models/Session')
const Subscription = require('../models/Subscription')
const Evaluation = require('../models/Evaluation')
const User = require('../models/User')
const { sendSuccess, sendError } = require('../utils/response')

exports.getMyStudents = async (req, res, next) => {
  try {
    const teacherId = req.user._id
    const subs = await Subscription.find({ teacherId, status: 'active' }).populate('studentId')
    const students = subs.map(s => {
      const st = s.studentId?.toPublic ? s.studentId.toPublic() : s.studentId
      return { ...st, subscriptionId: s._id }
    }).filter(Boolean)
    sendSuccess(res, students)
  } catch (err) {
    next(err)
  }
}

exports.getMyStats = async (req, res, next) => {
  try {
    const teacherId = req.user._id
    const now = new Date()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalStudents, sessionsToday, pendingEvals, completedMonth, upcomingSessions, recentStudents] = await Promise.all([
      Subscription.countDocuments({ teacherId, status: 'active' }),
      Session.countDocuments({ teacherId, scheduledAt: { $gte: today, $lte: todayEnd } }),
      Evaluation.countDocuments({ teacherId, createdAt: { $gte: monthStart } }),
      Session.countDocuments({ teacherId, status: 'completed', completedAt: { $gte: monthStart } }),
      Session.find({ teacherId, scheduledAt: { $gte: now }, status: 'scheduled' })
        .sort({ scheduledAt: 1 }).limit(6).populate('studentId', 'firstNameAr lastNameAr avatar'),
      User.find({ _id: { $in: (await Subscription.find({ teacherId, status: 'active' }).distinct('studentId')) } })
        .limit(5).select('firstNameAr lastNameAr avatar'),
    ])

    sendSuccess(res, { totalStudents, sessionsToday, pendingEvaluations: pendingEvals, completedThisMonth: completedMonth, upcomingSessions, recentStudents })
  } catch (err) {
    next(err)
  }
}

exports.getMyLinks = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('meetingLinks')
    sendSuccess(res, user?.meetingLinks || [])
  } catch (err) {
    next(err)
  }
}

exports.addLink = async (req, res, next) => {
  try {
    const { provider, label, link } = req.body
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { meetingLinks: { provider, label, link, _id: new (require('mongoose').Types.ObjectId)() } } },
      { new: true }
    ).select('meetingLinks')
    sendSuccess(res, user.meetingLinks, 'تم إضافة الرابط')
  } catch (err) {
    next(err)
  }
}

exports.removeLink = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { meetingLinks: { _id: req.params.linkId } } })
    sendSuccess(res, null, 'تم حذف الرابط')
  } catch (err) {
    next(err)
  }
}

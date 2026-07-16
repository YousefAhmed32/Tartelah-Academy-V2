const Session = require('../models/Session')
const Subscription = require('../models/Subscription')
const Evaluation = require('../models/Evaluation')
const User = require('../models/User')
const { sendSuccess, sendError } = require('../utils/response')
const { getPagination } = require('../utils/pagination')
const { toPublicTeacher } = require('../utils/teacherPublic')
const { isValidGender } = require('../config/teacherIdentity')

// ── Public (unauthenticated) teacher directory ───────────────────────────────
// Deliberately separate from /admin/teachers: no salary, email, phone,
// internal notes or admin metadata ever leaves toPublicTeacher().

exports.getPublicTeachers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = { role: 'teacher', isActive: true }
    if (req.query.gender) {
      if (!isValidGender(req.query.gender)) return sendError(res, 'قيمة غير صالحة لتصنيف المعلم', 400)
      filter.gender = req.query.gender
    }
    const [teachers, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('firstNameAr lastNameAr gender avatar specialization bioAr createdAt'),
      User.countDocuments(filter),
    ])
    sendSuccess(res, {
      teachers: teachers.map(toPublicTeacher),
      total, page, limit, totalPages: Math.ceil(total / limit),
    })
  } catch (err) { next(err) }
}

exports.getPublicTeacher = async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', isActive: true })
      .select('firstNameAr lastNameAr gender avatar specialization bioAr createdAt')
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)
    sendSuccess(res, toPublicTeacher(teacher))
  } catch (err) { next(err) }
}

exports.getMyStudents = async (req, res, next) => {
  try {
    const teacherId = req.user._id
    const subs = await Subscription.find({ teacherId, status: 'active' }).populate('studentId')
    const studentIds = subs.map(s => s.studentId?._id).filter(Boolean)

    // Attendance rate = completed / (all non-cancelled sessions) with THIS
    // teacher, mirroring the same completed-vs-total definition student.controller.js
    // uses for the student's own dashboard — computed here via aggregation
    // (not per-student queries) to stay O(1) round-trips regardless of roster size.
    const attendanceAgg = await Session.aggregate([
      { $match: { teacherId, studentId: { $in: studentIds }, status: { $ne: 'cancelled' } } },
      { $group: {
        _id: '$studentId',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      } },
    ])
    const attendanceRateByStudent = new Map(
      attendanceAgg.map(a => [a._id.toString(), a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0])
    )

    const students = subs.map(s => {
      const st = s.studentId?.toPublic ? s.studentId.toPublic() : s.studentId
      if (!st) return null
      return { ...st, subscriptionId: s._id, attendanceRate: attendanceRateByStudent.get(st._id.toString()) || 0 }
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

    // Bounded to the last 14 days — old unresolved sessions are an admin
    // review-queue concern (see Operations Center), not something to keep
    // nagging the teacher about indefinitely on their own dashboard.
    const attentionWindowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [totalStudents, sessionsToday, pendingEvals, completedMonth, upcomingSessions, recentStudents, needsAttention, ongoingSessions] = await Promise.all([
      Subscription.countDocuments({ teacherId, status: 'active' }),
      Session.countDocuments({ teacherId, scheduledAt: { $gte: today, $lte: todayEnd } }),
      Evaluation.countDocuments({ teacherId, createdAt: { $gte: monthStart } }),
      Session.countDocuments({ teacherId, status: 'completed', completedAt: { $gte: monthStart } }),
      Session.find({ teacherId, scheduledAt: { $gte: now }, status: 'scheduled' })
        .sort({ scheduledAt: 1 }).limit(6).populate('studentId', 'firstNameAr lastNameAr avatar'),
      User.find({ _id: { $in: (await Subscription.find({ teacherId, status: 'active' }).distinct('studentId')) } })
        .limit(5).select('firstNameAr lastNameAr avatar'),
      Session.countDocuments({
        teacherId,
        scheduledAt: { $gte: attentionWindowStart, $lte: now },
        $or: [
          { status: 'missed' },
          { status: 'completed', attendanceFinalizedAt: null },
        ],
      }),
      // Sessions the teacher has already started (platform check-in) but not
      // yet finished — surfaced so the Home Dashboard can swap the "upcoming
      // session" card for a live "current session" card without a page nav.
      Session.find({ teacherId, status: 'ongoing' })
        .sort({ scheduledAt: 1 }).populate('studentId', 'firstNameAr lastNameAr avatar'),
    ])

    sendSuccess(res, {
      totalStudents, sessionsToday, pendingEvaluations: pendingEvals, completedThisMonth: completedMonth,
      upcomingSessions, recentStudents, needsAttention,
      currentSession: ongoingSessions[0] || null, ongoingCount: ongoingSessions.length,
    })
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

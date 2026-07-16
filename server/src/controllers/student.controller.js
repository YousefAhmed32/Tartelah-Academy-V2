const Session = require('../models/Session')
const Homework = require('../models/Homework')
const Evaluation = require('../models/Evaluation')
const Subscription = require('../models/Subscription')
const Memorization = require('../models/Memorization')
const Attendance = require('../models/Attendance')
const { sendSuccess, sendError } = require('../utils/response')

exports.getMyStats = async (req, res, next) => {
  try {
    const studentId = req.user._id
    const now = new Date()
    const [upcomingSessions, subscription, pendingHw, evaluations, memorization, attendanceCounts] = await Promise.all([
      Session.find({ studentId, scheduledAt: { $gte: now }, status: { $in: ['scheduled', 'ongoing'] } })
        .sort({ scheduledAt: 1 }).limit(10)
        .populate('teacherId', 'firstNameAr lastNameAr avatar'),
      Subscription.findOne({ studentId, status: 'active' }).populate('packageId', 'nameAr sessionsPerMonth'),
      Homework.countDocuments({ assignedTo: studentId, status: 'active', dueDate: { $gte: now } }),
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).limit(5),
      Memorization.find({ studentId }),
      Attendance.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const allSessions = await Session.find({ studentId }, 'status')
    const completed = allSessions.filter(s => s.status === 'completed').length
    const cancelledSessions = allSessions.filter(s => s.status === 'cancelled').length
    const totalAttendance = allSessions.filter(s => s.status !== 'cancelled').length
    const attendanceRate = totalAttendance > 0 ? Math.round((completed / totalAttendance) * 100) : 0

    const attendanceByStatus = Object.fromEntries(attendanceCounts.map(a => [a._id, a.count]))
    const lateCount = attendanceByStatus.late || 0
    const absentCount = attendanceByStatus.absent || 0

    const daysLeft = subscription?.endDate
      ? Math.max(0, Math.ceil((new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24)))
      : 0

    const surahsCompleted = [...new Set(memorization.map(m => m.surahNumber))].length

    // Session-package status — purchased/consumed/remaining, per the
    // academy's session-based (not date-based) subscription model.
    const purchasedSessions = subscription?.totalSessions || 0
    const remainingSessions = subscription?.sessionsRemaining || 0
    const consumedSessions = Math.max(0, purchasedSessions - remainingSessions)

    sendSuccess(res, {
      attendanceRate,
      completedSessions: completed,
      cancelledSessions,
      lateCount,
      absentCount,
      pendingHomework: pendingHw,
      subscriptionDaysLeft: daysLeft,
      purchasedSessions,
      consumedSessions,
      remainingSessions,
      upcomingSessions,
      recentEvaluations: evaluations,
      memorization: { surahsCompleted, ayahsTotal: memorization.reduce((a, m) => a + (m.toAyah - m.fromAyah + 1), 0) },
    })
  } catch (err) {
    next(err)
  }
}

// "Academic record" on this platform is the student's session-based
// subscription history (package + teacher + progress), not a separate
// course-enrollment system — there is no live flow anywhere that links a
// student to a Course independent of their Subscription (the model's own
// optional `courseId` is populated defensively below in case it's ever set,
// but nothing currently sets it). Previously this read from an `Enrollment`
// model that only the seed script ever wrote to, so it showed nothing for
// any real student.
exports.getMyAcademic = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('packageId', 'nameAr descriptionAr sessionsPerMonth')
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
      .populate('courseId', 'nameAr name level')

    const programs = subscriptions.map((sub) => {
      const purchasedSessions = sub.totalSessions || 0
      const remainingSessions = sub.sessionsRemaining || 0
      const consumedSessions = Math.max(0, purchasedSessions - remainingSessions)
      const progressPercent = purchasedSessions > 0 ? Math.round((consumedSessions / purchasedSessions) * 100) : 0
      return {
        _id: sub._id,
        status: sub.status,
        packageNameAr: sub.packageNameAr || sub.packageId?.nameAr,
        package: sub.packageId,
        teacher: sub.teacherId,
        course: sub.courseId,
        purchasedSessions, consumedSessions, remainingSessions, progressPercent,
        startDate: sub.startDate, endDate: sub.endDate,
      }
    })

    const current = programs.find((p) => p.status === 'active') || programs[0] || null

    sendSuccess(res, { programs, current })
  } catch (err) {
    next(err)
  }
}

const Session = require('../models/Session')
const Homework = require('../models/Homework')
const Evaluation = require('../models/Evaluation')
const Subscription = require('../models/Subscription')
const Memorization = require('../models/Memorization')
const Enrollment = require('../models/Enrollment')
const { sendSuccess, sendError } = require('../utils/response')

exports.getMyStats = async (req, res, next) => {
  try {
    const studentId = req.user._id
    const now = new Date()
    const [upcomingSessions, subscription, pendingHw, evaluations, memorization] = await Promise.all([
      Session.find({ studentId, scheduledAt: { $gte: now }, status: { $in: ['scheduled', 'ongoing'] } })
        .sort({ scheduledAt: 1 }).limit(10)
        .populate('teacherId', 'firstNameAr lastNameAr avatar'),
      Subscription.findOne({ studentId, status: 'active' }).populate('packageId', 'nameAr sessionsPerMonth'),
      Homework.countDocuments({ assignedTo: studentId, status: 'active', dueDate: { $gte: now } }),
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).limit(5),
      Memorization.find({ studentId }),
    ])

    const allSessions = await Session.find({ studentId })
    const completed = allSessions.filter(s => s.status === 'completed').length
    const totalAttendance = allSessions.filter(s => s.status !== 'cancelled').length
    const attendanceRate = totalAttendance > 0 ? Math.round((completed / totalAttendance) * 100) : 0

    const daysLeft = subscription?.endDate
      ? Math.max(0, Math.ceil((new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24)))
      : 0

    const surahsCompleted = [...new Set(memorization.map(m => m.surahNumber))].length

    sendSuccess(res, {
      attendanceRate,
      completedSessions: completed,
      pendingHomework: pendingHw,
      subscriptionDaysLeft: daysLeft,
      upcomingSessions,
      recentEvaluations: evaluations,
      memorization: { surahsCompleted, ayahsTotal: memorization.reduce((a, m) => a + (m.toAyah - m.fromAyah + 1), 0) },
    })
  } catch (err) {
    next(err)
  }
}

exports.getMyAcademic = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate('courseId', 'nameAr name level')
    const currentCourse = enrollments.find(e => e.status === 'active')?.courseId
    sendSuccess(res, { enrollments, currentCourse })
  } catch (err) {
    next(err)
  }
}

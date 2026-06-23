const User = require('../models/User')
const Session = require('../models/Session')
const Subscription = require('../models/Subscription')
const Evaluation = require('../models/Evaluation')
const EnrollmentRequest = require('../models/EnrollmentRequest')
const { sendSuccess, sendPaginated } = require('../utils/response')
const { getPagination, buildSearchFilter } = require('../utils/pagination')

exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalStudents, totalTeachers, activeSubscriptions, pendingEnrollments, sessionStats, recentRegistrations, upcomingSessions] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Subscription.countDocuments({ status: 'active' }),
      EnrollmentRequest.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      Session.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, todayCount: { $sum: { $cond: [{ $and: [{ $gte: ['$scheduledAt', today] }, { $lte: ['$scheduledAt', todayEnd] }] }, 1, 0] } } } }
      ]),
      User.find({ isActive: true }).sort({ createdAt: -1 }).limit(8).select('firstNameAr lastNameAr email avatar role createdAt'),
      Session.find({ scheduledAt: { $gte: today, $lte: todayEnd }, status: { $in: ['scheduled', 'ongoing'] } })
        .sort({ scheduledAt: 1 }).limit(10)
        .populate('studentId teacherId', 'firstNameAr lastNameAr avatar'),
    ])

    const revenue = await Subscription.aggregate([
      { $group: { _id: null, total: { $sum: '$amountPaid' }, thisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, '$amountPaid', 0] } } } }
    ])

    sendSuccess(res, {
      totalStudents,
      totalTeachers,
      activeSubscriptions,
      pendingEnrollments,
      totalRevenue: revenue[0]?.total || 0,
      totalSessions: sessionStats[0]?.total || 0,
      sessionsToday: sessionStats[0]?.todayCount || 0,
      recentRegistrations,
      upcomingSessions,
    })
  } catch (err) {
    next(err)
  }
}

exports.getStudents = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const searchFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'email'])
    const filter = { role: 'student', ...searchFilter }
    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password -refreshToken'),
      User.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) {
    next(err)
  }
}

exports.updateStudent = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('-password')
    sendSuccess(res, user, 'تم تحديث الطالب')
  } catch (err) {
    next(err)
  }
}

exports.getTeachers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const searchFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'email'])
    const filter = { role: 'teacher', ...searchFilter }
    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password -refreshToken'),
      User.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) {
    next(err)
  }
}

exports.createTeacher = async (req, res, next) => {
  try {
    const user = await User.create({ ...req.body, role: 'teacher' })
    sendSuccess(res, user.toPublic(), 'تم إنشاء حساب المعلم', 201)
  } catch (err) {
    next(err)
  }
}

exports.updateTeacher = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password')
    sendSuccess(res, user, 'تم تحديث المعلم')
  } catch (err) {
    next(err)
  }
}

exports.getAllSessions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    const [data, total] = await Promise.all([
      Session.find(filter).sort({ scheduledAt: -1 }).skip(skip).limit(limit)
        .populate('studentId teacherId', 'firstNameAr lastNameAr'),
      Session.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) {
    next(err)
  }
}

exports.getReports = async (req, res, next) => {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [thisMonthRev, lastMonthRev, totalRev, totalSessions, thisMonthSessions, totalStudents, activeStudents, newStudents, completedSessions, totalSessionsCount] = await Promise.all([
      Subscription.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, sum: { $sum: '$amountPaid' } } }]),
      Subscription.aggregate([{ $match: { createdAt: { $gte: lastMonthStart, $lt: monthStart } } }, { $group: { _id: null, sum: { $sum: '$amountPaid' } } }]),
      Subscription.aggregate([{ $group: { _id: null, sum: { $sum: '$amountPaid' } } }]),
      Session.countDocuments(),
      Session.countDocuments({ createdAt: { $gte: monthStart } }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'student', createdAt: { $gte: monthStart } }),
      Session.countDocuments({ status: 'completed' }),
      Session.countDocuments(),
    ])

    const thisM = thisMonthRev[0]?.sum || 0
    const lastM = lastMonthRev[0]?.sum || 0
    const growth = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : 0

    const topTeachers = await User.aggregate([
      { $match: { role: 'teacher', isActive: true } },
      { $lookup: { from: 'subscriptions', localField: '_id', foreignField: 'teacherId', as: 'subs' } },
      { $lookup: { from: 'sessions', localField: '_id', foreignField: 'teacherId', as: 'sessions' } },
      { $project: { firstNameAr: 1, lastNameAr: 1, studentCount: { $size: '$subs' }, sessionCount: { $size: '$sessions' } } },
      { $sort: { sessionCount: -1 } },
      { $limit: 5 },
    ])

    sendSuccess(res, {
      revenue: { total: totalRev[0]?.sum || 0, thisMonth: thisM, lastMonth: lastM, growth },
      sessions: { total: totalSessions, thisMonth: thisMonthSessions, completionRate: totalSessionsCount > 0 ? Math.round((completedSessions / totalSessionsCount) * 100) : 0 },
      students: { total: totalStudents, active: activeStudents, new: newStudents },
      topTeachers,
    })
  } catch (err) {
    next(err)
  }
}

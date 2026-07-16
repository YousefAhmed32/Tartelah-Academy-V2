const User = require('../models/User')
const Session = require('../models/Session')
const Subscription = require('../models/Subscription')
const Evaluation = require('../models/Evaluation')
const Attendance = require('../models/Attendance')
const Homework = require('../models/Homework')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const EnrollmentRequest = require('../models/EnrollmentRequest')
const ScheduleRule = require('../models/ScheduleRule')
const Notification = require('../models/Notification')
const scheduleService = require('../services/schedule.service')
const { createNotification } = require('../services/notification.service')
const { logAction } = require('../services/audit.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination, buildSearchFilter } = require('../utils/pagination')
const { isValidGender } = require('../config/teacherIdentity')
const crypto = require('crypto')

// ── Dashboard ────────────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalStudents, totalTeachers, activeSubscriptions, pendingEnrollments, sessionStats,
      recentRegistrations, upcomingSessions, pendingHomeworkGrading,
      studentsClosingPackage, studentsClosingPackageCount, monthSessionStats,
    ] = await Promise.all([
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
      // Ungraded homework submissions across all assignments — a teacher-grading
      // backlog signal that previously had no admin-visible surface at all.
      Homework.aggregate([
        { $unwind: '$submissions' },
        { $match: { 'submissions.status': 'submitted' } },
        { $count: 'count' },
      ]),
      // Students close to finishing their session package — the session-based
      // subscription model's equivalent of "renewal is coming up soon."
      Subscription.find({ status: 'active', sessionsRemaining: { $gt: 0, $lte: 3 } })
        .sort({ sessionsRemaining: 1 }).limit(10)
        .populate('studentId', 'firstNameAr lastNameAr avatar')
        .populate('packageId', 'nameAr'),
      Subscription.countDocuments({ status: 'active', sessionsRemaining: { $gt: 0, $lte: 3 } }),
      // This month's teacher/session operational snapshot — payable sessions,
      // teacher lateness, and cancellations, surfaced directly on the
      // dashboard rather than only inside the dedicated performance pages.
      Session.aggregate([
        { $match: { scheduledAt: { $gte: monthStart } } },
        { $group: {
          _id: null,
          completedSessions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelledSessions: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          payableSessions: { $sum: { $cond: [{ $eq: ['$payrollStatus', 'payable'] }, 1, 0] } },
          lateTeacherSessions: { $sum: { $cond: [{ $eq: ['$teacherAttendanceStatus', 'late'] }, 1, 0] } },
        } },
      ]),
    ])

    const revenue = await Subscription.aggregate([
      { $group: { _id: null, total: { $sum: '$amountPaid' }, thisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, '$amountPaid', 0] } } } }
    ])

    const activeSubStudentIds = await Subscription.distinct('studentId', { status: 'active' })
    const scheduledStudentIds = await ScheduleRule.distinct('studentId', { status: 'active' })
    const unscheduledCount = activeSubStudentIds.filter(
      id => !scheduledStudentIds.some(s => s.toString() === id.toString())
    ).length

    const monthStats = monthSessionStats[0] || {}

    sendSuccess(res, {
      totalStudents, totalTeachers, activeSubscriptions, pendingEnrollments,
      unscheduledStudents: unscheduledCount,
      pendingHomeworkGrading: pendingHomeworkGrading[0]?.count || 0,
      totalRevenue: revenue[0]?.total || 0,
      totalSessions: sessionStats[0]?.total || 0,
      sessionsToday: sessionStats[0]?.todayCount || 0,
      recentRegistrations, upcomingSessions,
      studentsClosingPackage, studentsClosingPackageCount,
      thisMonth: {
        completedSessions: monthStats.completedSessions || 0,
        cancelledSessions: monthStats.cancelledSessions || 0,
        payableSessions: monthStats.payableSessions || 0,
        lateTeacherSessions: monthStats.lateTeacherSessions || 0,
      },
    })
  } catch (err) { next(err) }
}

// ── Reports ──────────────────────────────────────────────────────────────────

exports.getReports = async (req, res, next) => {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [
      thisMonthRev, lastMonthRev, totalRev, totalSessions, thisMonthSessions, totalStudents,
      activeStudents, newStudents, completedSessions, totalSessionsCount, cancelledSessionsCount,
      attendanceByStatus, teacherPayrollStats,
    ] = await Promise.all([
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
      Session.countDocuments({ status: 'cancelled' }),
      // Student attendance breakdown — org-wide, per status.
      Attendance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      // Teacher payroll/lateness — mirrors the payability policy in
      // sessionIntelligence.service.js so the report never diverges from it.
      Session.aggregate([
        { $group: {
          _id: null,
          payableSessions: { $sum: { $cond: [{ $eq: ['$payrollStatus', 'payable'] }, 1, 0] } },
          nonPayableSessions: { $sum: { $cond: [{ $eq: ['$payrollStatus', 'non_payable'] }, 1, 0] } },
          lateTeacherSessions: { $sum: { $cond: [{ $eq: ['$teacherAttendanceStatus', 'late'] }, 1, 0] } },
        } },
      ]),
    ])

    const thisM = thisMonthRev[0]?.sum || 0
    const lastM = lastMonthRev[0]?.sum || 0
    const growth = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : 0

    const attByStatus = Object.fromEntries(attendanceByStatus.map(a => [a._id, a.count]))
    const totalAttendance = attendanceByStatus.reduce((sum, a) => sum + a.count, 0)
    const presentAttendance = (attByStatus.present || 0) + (attByStatus.late || 0)
    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0
    const payroll = teacherPayrollStats[0] || {}

    const topTeachers = await User.aggregate([
      { $match: { role: 'teacher', isActive: true } },
      { $lookup: { from: 'subscriptions', localField: '_id', foreignField: 'teacherId', as: 'subs' } },
      { $lookup: { from: 'sessions', localField: '_id', foreignField: 'teacherId', as: 'sessions' } },
      { $lookup: { from: 'evaluations', localField: '_id', foreignField: 'teacherId', as: 'evals' } },
      {
        $project: {
          firstNameAr: 1, lastNameAr: 1,
          studentCount: { $size: '$subs' },
          sessionCount: { $size: '$sessions' },
          avgEvaluation: { $avg: '$evals.score' },
        }
      },
      { $sort: { sessionCount: -1 } },
      { $limit: 5 },
    ])

    sendSuccess(res, {
      revenue: { total: totalRev[0]?.sum || 0, thisMonth: thisM, lastMonth: lastM, growth },
      sessions: {
        total: totalSessions, thisMonth: thisMonthSessions,
        completionRate: totalSessionsCount > 0 ? Math.round((completedSessions / totalSessionsCount) * 100) : 0,
        cancelled: cancelledSessionsCount,
      },
      students: { total: totalStudents, active: activeStudents, new: newStudents },
      attendance: {
        rate: attendanceRate,
        present: attByStatus.present || 0,
        late: attByStatus.late || 0,
        absent: attByStatus.absent || 0,
        excused: attByStatus.excused || 0,
      },
      teacherPayroll: {
        payableSessions: payroll.payableSessions || 0,
        nonPayableSessions: payroll.nonPayableSessions || 0,
        lateTeacherSessions: payroll.lateTeacherSessions || 0,
      },
      topTeachers,
    })
  } catch (err) { next(err) }
}

// ── Students ─────────────────────────────────────────────────────────────────

exports.getStudents = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const searchFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'email'])
    const filter = { role: 'student', ...searchFilter }
    if (req.query.status === 'active') filter.isActive = true
    if (req.query.status === 'inactive') filter.isActive = false
    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password -refreshToken'),
      User.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) { next(err) }
}

exports.getStudent = async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-password -refreshToken')
    if (!student) return sendError(res, 'الطالب غير موجود', 404)

    const [subscription, sessions, evaluations, enrollmentRequests] = await Promise.all([
      Subscription.findOne({ studentId: req.params.id, status: 'active' })
        .populate('packageId', 'nameAr price sessionsPerMonth')
        .populate('teacherId', 'firstNameAr lastNameAr avatar'),
      Session.find({ studentId: req.params.id }).sort({ scheduledAt: -1 }).limit(10)
        .populate('teacherId', 'firstNameAr lastNameAr'),
      Evaluation.find({ studentId: req.params.id }).sort({ createdAt: -1 }).limit(5)
        .populate('teacherId', 'firstNameAr lastNameAr'),
      EnrollmentRequest.find({ studentId: req.params.id }).sort({ createdAt: -1 })
        .populate('packageId', 'nameAr price'),
    ])

    sendSuccess(res, { student, subscription, recentSessions: sessions, recentEvaluations: evaluations, enrollmentRequests })
  } catch (err) { next(err) }
}

exports.updateStudent = async (req, res, next) => {
  try {
    const allowed = ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone', 'isActive', 'bioAr']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'student' },
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken')
    if (!user) return sendError(res, 'الطالب غير موجود', 404)
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'update_student', entity: 'User', entityId: user._id, changes: updates, ip: req.ip })
    sendSuccess(res, user, 'تم تحديث بيانات الطالب')
  } catch (err) { next(err) }
}

exports.deleteStudent = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'student' },
      { isActive: false },
      { new: true }
    )
    if (!user) return sendError(res, 'الطالب غير موجود', 404)
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'deactivate_student', entity: 'User', entityId: user._id, ip: req.ip })
    sendSuccess(res, null, 'تم إيقاف حساب الطالب')
  } catch (err) { next(err) }
}

// ── Teachers ─────────────────────────────────────────────────────────────────

exports.getTeachers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const searchFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'email'])
    const filter = { role: 'teacher', ...searchFilter }
    if (req.query.status === 'active') filter.isActive = true
    if (req.query.status === 'inactive') filter.isActive = false

    // Aggregate teacher stats with student/session counts
    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: { from: 'subscriptions', localField: '_id', foreignField: 'teacherId', as: 'subs' } },
      { $lookup: { from: 'sessions', localField: '_id', foreignField: 'teacherId', as: 'sessionList' } },
      {
        $addFields: {
          studentCount: { $size: '$subs' },
          sessionCount: { $size: '$sessionList' },
        }
      },
      {
        $project: {
          password: 0, refreshToken: 0, passwordResetToken: 0, passwordResetExpires: 0,
          subs: 0, sessionList: 0,
        }
      },
    ]
    const [data, total] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) { next(err) }
}

exports.getTeacher = async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('-password -refreshToken')
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)

    const [students, sessions, scheduleRules] = await Promise.all([
      Subscription.find({ teacherId: req.params.id, status: 'active' })
        .populate('studentId', 'firstNameAr lastNameAr avatar email phone'),
      Session.find({ teacherId: req.params.id }).sort({ scheduledAt: -1 }).limit(10)
        .populate('studentId', 'firstNameAr lastNameAr'),
      ScheduleRule.find({ teacherId: req.params.id, status: 'active' })
        .populate('studentId', 'firstNameAr lastNameAr avatar'),
    ])

    sendSuccess(res, { teacher, students, recentSessions: sessions, scheduleRules })
  } catch (err) { next(err) }
}

exports.createTeacher = async (req, res, next) => {
  try {
    const existing = await User.findOne({ email: req.body.email })
    if (existing) return sendError(res, 'البريد الإلكتروني مسجل مسبقاً', 409)
    if (req.body.gender !== undefined && !isValidGender(req.body.gender)) {
      return sendError(res, 'يجب تحديد تصنيف المعلم: معلم أو معلمة', 400)
    }
    const user = await User.create({ ...req.body, role: 'teacher' })
    sendSuccess(res, user.toPublic(), 'تم إنشاء حساب المعلم', 201)
  } catch (err) { next(err) }
}

exports.updateTeacher = async (req, res, next) => {
  try {
    if (req.body.gender !== undefined && req.body.gender !== null && !isValidGender(req.body.gender)) {
      return sendError(res, 'يجب تحديد تصنيف المعلم: معلم أو معلمة', 400)
    }
    const allowed = ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone', 'isActive', 'bioAr', 'specialization', 'salaryPerSession', 'gender']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'teacher' },
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken')
    if (!user) return sendError(res, 'المعلم غير موجود', 404)
    sendSuccess(res, user, 'تم تحديث بيانات المعلم')
  } catch (err) { next(err) }
}

// ── Password Reset (admin-initiated) ─────────────────────────────────────────

exports.adminResetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 8) return sendError(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', 400)
    const user = await User.findById(req.params.id).select('+password')
    if (!user) return sendError(res, 'المستخدم غير موجود', 404)
    user.password = newPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()
    await createNotification({
      userId: user._id,
      titleAr: 'تم إعادة تعيين كلمة المرور',
      bodyAr: 'قام المسؤول بإعادة تعيين كلمة مرورك. يرجى تسجيل الدخول بالكلمة الجديدة.',
      type: 'system', priority: 'high',
    })
    logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'reset_password', entity: 'User', entityId: user._id, changes: { field: 'password' }, ip: req.ip })
    sendSuccess(res, null, 'تم إعادة تعيين كلمة المرور')
  } catch (err) { next(err) }
}

// ── Sessions ─────────────────────────────────────────────────────────────────

exports.getAllSessions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.teacherId) filter.teacherId = req.query.teacherId
    if (req.query.studentId) filter.studentId = req.query.studentId
    if (req.query.payrollStatus) filter.payrollStatus = req.query.payrollStatus
    if (req.query.dateFrom || req.query.dateTo) {
      filter.scheduledAt = {}
      if (req.query.dateFrom) filter.scheduledAt.$gte = new Date(req.query.dateFrom)
      if (req.query.dateTo) filter.scheduledAt.$lte = new Date(req.query.dateTo)
    }
    const [data, total] = await Promise.all([
      Session.find(filter).sort({ scheduledAt: -1 }).skip(skip).limit(limit)
        .populate('studentId teacherId', 'firstNameAr lastNameAr avatar'),
      Session.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) { next(err) }
}

// ── Academic Override ─────────────────────────────────────────────────────────

exports.getStudentAcademics = async (req, res, next) => {
  try {
    const studentId = req.params.studentId
    const [evaluations, attendance, homework, memorization, revision] = await Promise.all([
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).populate('teacherId', 'firstNameAr lastNameAr'),
      Attendance.find({ studentId }).sort({ createdAt: -1 }).populate('sessionId', 'titleAr scheduledAt'),
      Homework.find({ assignedTo: studentId }).sort({ dueDate: -1 }),
      Memorization.find({ studentId }).sort({ createdAt: -1 }).limit(20),
      Revision.find({ studentId }).sort({ createdAt: -1 }).limit(20),
    ])
    sendSuccess(res, { evaluations, attendance, homework, memorization, revision })
  } catch (err) { next(err) }
}

exports.updateEvaluation = async (req, res, next) => {
  try {
    const allowed = ['score', 'notesAr', 'strengths', 'improvements', 'type', 'isSharedWithStudent']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const ev = await Evaluation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('studentId teacherId', 'firstNameAr lastNameAr')
    if (!ev) return sendError(res, 'التقييم غير موجود', 404)
    sendSuccess(res, ev, 'تم تحديث التقييم')
  } catch (err) { next(err) }
}

exports.deleteEvaluation = async (req, res, next) => {
  try {
    const ev = await Evaluation.findByIdAndDelete(req.params.id)
    if (!ev) return sendError(res, 'التقييم غير موجود', 404)
    sendSuccess(res, null, 'تم حذف التقييم')
  } catch (err) { next(err) }
}

exports.updateAttendanceRecord = async (req, res, next) => {
  try {
    const allowed = ['status', 'notes']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const att = await Attendance.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('studentId', 'firstNameAr lastNameAr')
      .populate('sessionId', 'titleAr scheduledAt')
    if (!att) return sendError(res, 'سجل الحضور غير موجود', 404)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'attendance.admin_override',
      entity: 'Attendance', entityId: att._id, changes: updates, ip: req.ip,
    })

    sendSuccess(res, att, 'تم تحديث سجل الحضور')
  } catch (err) { next(err) }
}

exports.updateHomework = async (req, res, next) => {
  try {
    const allowed = ['titleAr', 'descriptionAr', 'dueDate', 'status']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const hw = await Homework.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!hw) return sendError(res, 'الواجب غير موجود', 404)
    sendSuccess(res, hw, 'تم تحديث الواجب')
  } catch (err) { next(err) }
}

// ── Individual Notification ───────────────────────────────────────────────────

exports.sendIndividualNotification = async (req, res, next) => {
  try {
    const { userId, titleAr, bodyAr, type, priority } = req.body
    if (!userId || !titleAr) return sendError(res, 'معرف المستخدم والعنوان مطلوبان', 400)
    const user = await User.findById(userId)
    if (!user) return sendError(res, 'المستخدم غير موجود', 404)
    await createNotification({
      userId, titleAr, bodyAr,
      type: type || 'system',
      priority: priority || 'medium',
    })
    sendSuccess(res, null, 'تم إرسال الإشعار')
  } catch (err) { next(err) }
}

// ── Schedule Rules Overview ───────────────────────────────────────────────────

exports.getAllScheduleRules = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.teacherId) filter.teacherId = req.query.teacherId
    if (req.query.status) filter.status = req.query.status
    const [data, total] = await Promise.all([
      ScheduleRule.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('teacherId', 'firstNameAr lastNameAr avatar')
        .populate('studentId', 'firstNameAr lastNameAr avatar'),
      ScheduleRule.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) { next(err) }
}

// Admin has full authority over any teacher's recurring schedule: the
// operational fields plus recurrence changes and reassigning the
// teacher/student — teachers keep their own create/edit permissions
// unchanged via schedule.routes.js.
exports.updateScheduleRule = async (req, res, next) => {
  try {
    const allowed = [
      'status', 'meetingLink', 'meetingProvider', 'endDate', 'sessionsTotal', 'notes',
      'frequency', 'daysOfWeek', 'timeOfDay', 'durationMinutes', 'teacherId', 'studentId',
    ]
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const rule = await ScheduleRule.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('teacherId studentId', 'firstNameAr lastNameAr')
    if (!rule) return sendError(res, 'القاعدة غير موجودة', 404)

    // Keep not-yet-happened generated sessions in sync — past sessions
    // (history/payroll data) are never rewritten.
    const futureUpdate = {}
    if (updates.meetingLink !== undefined) { futureUpdate.meetingLink = updates.meetingLink; futureUpdate.meetingProvider = updates.meetingProvider || rule.meetingProvider }
    if (updates.teacherId !== undefined) futureUpdate.teacherId = updates.teacherId
    if (updates.studentId !== undefined) futureUpdate.studentId = updates.studentId
    if (Object.keys(futureUpdate).length) {
      await Session.updateMany(
        { seriesId: rule._id, status: 'scheduled', scheduledAt: { $gte: new Date() } },
        futureUpdate
      )
    }

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.admin_update',
      entity: 'ScheduleRule', entityId: rule._id, changes: updates, ip: req.ip,
    })

    sendSuccess(res, rule, 'تم تحديث الجدول الدوري')
  } catch (err) { next(err) }
}

// Admin: delete any teacher's rule. Preserves history — only removes
// sessions that haven't happened yet.
exports.deleteScheduleRule = async (req, res, next) => {
  try {
    const rule = await ScheduleRule.findById(req.params.id)
    if (!rule) return sendError(res, 'القاعدة غير موجودة', 404)

    const removed = await Session.deleteMany({
      seriesId: rule._id, status: 'scheduled', scheduledAt: { $gte: new Date() },
    })
    await ScheduleRule.deleteOne({ _id: rule._id })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.admin_delete',
      entity: 'ScheduleRule', entityId: rule._id,
      changes: { removedFutureSessions: removed.deletedCount }, ip: req.ip,
    })

    sendSuccess(res, null, 'تم حذف الجدول')
  } catch (err) { next(err) }
}

// Admin: generate additional sessions for any teacher's existing rule.
exports.generateMoreScheduleRule = async (req, res, next) => {
  try {
    const rule = await ScheduleRule.findById(req.params.id)
    if (!rule) return sendError(res, 'القاعدة غير موجودة', 404)

    if (req.body.startDate) rule.startDate = new Date(req.body.startDate)
    if (req.body.endDate) rule.endDate = new Date(req.body.endDate)
    if (req.body.sessionsTotal) rule.sessionsTotal = Number(req.body.sessionsTotal)
    await rule.save()

    const sessions = await scheduleService.generateSessionsFromRule(rule)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.admin_generate_more',
      entity: 'ScheduleRule', entityId: rule._id, changes: { sessionCount: sessions.length }, ip: req.ip,
    })

    sendSuccess(res, { sessions, count: sessions.length }, `تم توليد ${sessions.length} حصة إضافية`)
  } catch (err) { next(err) }
}

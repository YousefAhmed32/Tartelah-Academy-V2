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
const QuranSessionReport = require('../models/QuranSessionReport')
const scheduleService = require('../services/schedule.service')
const { createNotification } = require('../services/notification.service')
const { logAction } = require('../services/audit.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination, buildSearchFilter } = require('../utils/pagination')
const { isValidGender } = require('../config/teacherIdentity')
const { validateTeacherProfileFields } = require('../config/teacherProfile')
const { resolveCredentialInput, CredentialError } = require('../config/credentialMode')
const { isValidAudienceCategoriesArray, isValidAudienceCategory } = require('../config/studentAudience')
// Dynamic catalog-backed check (replaces the old static allow-list) — a
// filter must accept any KNOWN subject, active or archived, so filtering by
// an archived subject to review historical teachers still works. See
// services/teachingSubject.service.js.
const { isKnownKey } = require('../services/teachingSubject.service')
const TeacherWorkingHours = require('../models/TeacherWorkingHours')
const LessonWallet = require('../models/LessonWallet')
const walletService = require('../services/wallet.service')
const { createSubscriptionWithOpeningBalance } = require('../services/subscription.service')
const { resolveDatePreset } = require('../utils/datePresets')
const { cleanEmail } = require('../utils/arabicNormalize')
const { getAcademyTimezone } = require('../services/academySettings.service')
const { academyDateKey, academyDateKeyBounds, academyDayBounds, academyMonthBounds } = require('../utils/academyDateTime')
const crypto = require('crypto')

const MONTHS_AR_SHORT = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

// Turns a Mongo $group-by-{y,m} aggregation result into a fixed-length,
// gap-filled series for the last `monthsBack` months ending this month —
// real months with zero activity show as 0, not a linear interpolation or
// invented value, and the array is always exactly `monthsBack` long
// regardless of which specific months had documents. Reused by every
// monthly trend the Reports page charts (see getReports below) so the
// charts reflect actual historical data instead of a distributed guess.
function buildMonthSeries(aggResult, monthsBack, now = new Date()) {
  const byKey = new Map(aggResult.map(r => [`${r._id.y}-${r._id.m}`, r]))
  const series = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    const row = byKey.get(key)
    series.push({ month: MONTHS_AR_SHORT[d.getMonth()], value: row?.sum ?? row?.count ?? 0 })
  }
  return series
}

// ── Dashboard ────────────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date()
    const timezone = await getAcademyTimezone()
    const { start: today, end: todayEnd } = academyDayBounds(now, timezone)
    const [academyYear, academyMonth] = academyDateKey(now, timezone).split('-').map(Number)
    const { start: monthStart } = academyMonthBounds(academyYear, academyMonth, timezone)

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
        { $group: { _id: null, total: { $sum: 1 }, todayCount: { $sum: { $cond: [{ $and: [{ $gte: ['$scheduledAt', today] }, { $lt: ['$scheduledAt', todayEnd] }] }, 1, 0] } } } }
      ]),
      User.find({ isActive: true }).sort({ createdAt: -1 }).limit(8).select('firstNameAr lastNameAr email avatar role createdAt'),
      Session.find({ scheduledAt: { $gte: today, $lt: todayEnd } })
        .sort({ scheduledAt: 1 }).limit(20)
        .populate('studentId teacherId', 'firstNameAr lastNameAr avatar email phone'),
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

    // Fetch reports and student attendance for today's sessions
    const todaySessionIds = upcomingSessions.map(s => s._id)
    const [sessionReports, attendances] = await Promise.all([
      QuranSessionReport.find({ sessionId: { $in: todaySessionIds } })
        .select('sessionId status submittedAt tajweedNotes generalEvaluation')
        .lean(),
      Attendance.find({ sessionId: { $in: todaySessionIds } })
        .select('sessionId studentId teacherId status notes arrivalTime isFinalized')
        .lean(),
    ])
    const reportMap = new Map(sessionReports.map(r => [r.sessionId.toString(), r]))
    const attendanceMap = new Map(attendances.map(a => [a.sessionId.toString(), a]))

    const enrichedUpcomingSessions = upcomingSessions.map(s => {
      const sObj = s.toObject ? s.toObject() : s
      const rep = reportMap.get(s._id.toString())
      const att = attendanceMap.get(s._id.toString())
      const schedTime = new Date(s.scheduledAt).getTime()
      const nowTime = now.getTime()

      const isLate = s.status === 'scheduled' && !s.teacherStartedAt && (nowTime > schedTime + 5 * 60000)
      const lateMinutes = isLate ? Math.floor((nowTime - schedTime) / 60000) : (s.teacherLateMinutes || 0)
      const ongoingMinutes = s.status === 'ongoing'
        ? Math.max(1, Math.floor((nowTime - new Date(s.teacherStartedAt || s.actualStartAt || s.scheduledAt).getTime()) / 60000))
        : 0

      // Compute student attendance status accurately
      let studentAttendanceStatus = att?.status
      if (!studentAttendanceStatus) {
        if (s.status === 'completed') studentAttendanceStatus = 'present'
        else if (s.status === 'no_show' || s.outcome === 'no_students_attended') studentAttendanceStatus = 'absent'
        else if (s.status === 'cancelled') studentAttendanceStatus = 'excused'
        else studentAttendanceStatus = 'pending'
      }

      return {
        ...sObj,
        attendance: att || null,
        studentAttendanceStatus,
        report: rep ? {
          status: rep.status,
          submittedAt: rep.submittedAt,
          generalEvaluation: rep.generalEvaluation,
        } : null,
        hasReport: !!rep,
        isReportSubmitted: ['submitted', 'approved'].includes(rep?.status),
        isTeacherStarted: !!s.teacherStartedAt,
        isLate,
        lateMinutes,
        ongoingMinutes,
      }
    })

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
      recentRegistrations, upcomingSessions: enrichedUpcomingSessions,
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
    const { preset, startDate, endDate } = req.query
    const dateRange = resolveDatePreset(preset, startDate, endDate)
    const { start: periodStart, end: periodEnd, compStart, compEnd, label: periodLabel, preset: resolvedPreset } = dateRange

    const now = new Date()
    const TREND_MONTHS = 6
    const trendStart = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1), 1)

    const [
      periodRev, compRev, totalRev, totalSessions, periodSessions, totalStudents,
      activeStudents, newStudents, completedSessions, periodCompletedSessions,
      cancelledSessionsCount, periodCancelledSessionsCount,
      periodAttendanceByStatus, allAttendanceByStatus, teacherPayrollStats,
      revenueTrendRaw, sessionsTrendRaw, studentsTrendRaw,
    ] = await Promise.all([
      Subscription.aggregate([{ $match: { createdAt: { $gte: periodStart, $lte: periodEnd } } }, { $group: { _id: null, sum: { $sum: '$amountPaid' } } }]),
      Subscription.aggregate([{ $match: { createdAt: { $gte: compStart, $lte: compEnd } } }, { $group: { _id: null, sum: { $sum: '$amountPaid' } } }]),
      Subscription.aggregate([{ $group: { _id: null, sum: { $sum: '$amountPaid' } } }]),
      Session.countDocuments(),
      Session.countDocuments({ scheduledAt: { $gte: periodStart, $lte: periodEnd } }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'student', createdAt: { $gte: periodStart, $lte: periodEnd } }),
      Session.countDocuments({ status: 'completed' }),
      Session.countDocuments({ scheduledAt: { $gte: periodStart, $lte: periodEnd }, status: 'completed' }),
      Session.countDocuments({ status: 'cancelled' }),
      Session.countDocuments({ scheduledAt: { $gte: periodStart, $lte: periodEnd }, status: 'cancelled' }),
      // Student attendance breakdown for current period
      Attendance.aggregate([{ $match: { createdAt: { $gte: periodStart, $lte: periodEnd } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      // Overall student attendance breakdown fallback
      Attendance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      // Teacher payroll/lateness for current period
      Session.aggregate([
        { $match: { scheduledAt: { $gte: periodStart, $lte: periodEnd } } },
        { $group: {
          _id: null,
          payableSessions: { $sum: { $cond: [{ $eq: ['$payrollStatus', 'payable'] }, 1, 0] } },
          nonPayableSessions: { $sum: { $cond: [{ $eq: ['$payrollStatus', 'non_payable'] }, 1, 0] } },
          lateTeacherSessions: { $sum: { $cond: [{ $eq: ['$teacherAttendanceStatus', 'late'] }, 1, 0] } },
        } },
      ]),
      // Real month-by-month series for the Reports page charts
      Subscription.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, sum: { $sum: '$amountPaid' } } },
      ]),
      Session.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { role: 'student', createdAt: { $gte: trendStart } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
    ])

    const thisM = periodRev[0]?.sum || 0
    const lastM = compRev[0]?.sum || 0
    const growth = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : 0

    // Prefer period attendance if records exist, otherwise fallback to all-time
    const activeAttSource = periodAttendanceByStatus.length ? periodAttendanceByStatus : allAttendanceByStatus
    const attByStatus = Object.fromEntries(activeAttSource.map(a => [a._id, a.count]))
    const totalAttendance = activeAttSource.reduce((sum, a) => sum + a.count, 0)
    const presentAttendance = (attByStatus.present || 0) + (attByStatus.late || 0)
    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0
    const payroll = teacherPayrollStats[0] || {}

    const completionRate = periodSessions > 0
      ? Math.round((periodCompletedSessions / periodSessions) * 100)
      : (totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0)

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
      period: {
        preset: resolvedPreset,
        label: periodLabel,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
        compStartDate: compStart.toISOString(),
        compEndDate: compEnd.toISOString(),
      },
      revenue: {
        total: totalRev[0]?.sum || 0,
        thisMonth: thisM,
        lastMonth: lastM,
        periodRevenue: thisM,
        compRevenue: lastM,
        growth,
      },
      sessions: {
        total: totalSessions,
        thisMonth: periodSessions,
        periodSessions,
        completionRate,
        cancelled: periodSessions > 0 ? periodCancelledSessionsCount : cancelledSessionsCount,
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
      trends: {
        revenue: buildMonthSeries(revenueTrendRaw, TREND_MONTHS, now),
        sessions: buildMonthSeries(sessionsTrendRaw, TREND_MONTHS, now),
        students: buildMonthSeries(studentsTrendRaw, TREND_MONTHS, now),
      },
    })
  } catch (err) { next(err) }
}

// ── Students ─────────────────────────────────────────────────────────────────

exports.getStudents = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const searchFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone'])
    const filter = { role: 'student', ...searchFilter }
    if (req.query.status === 'active') filter.isActive = true
    if (req.query.status === 'inactive') filter.isActive = false
    if (['existing', 'new'].includes(req.query.studentType)) filter.studentType = req.query.studentType
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

    const [subscription, sessions, evaluations, enrollmentRequests, wallet] = await Promise.all([
      Subscription.findOne({ studentId: req.params.id, status: 'active' })
        .populate('packageId', 'nameAr price sessionsPerMonth')
        .populate('teacherId', 'firstNameAr lastNameAr avatar'),
      Session.find({ studentId: req.params.id }).sort({ scheduledAt: -1 }).limit(10)
        .populate('teacherId', 'firstNameAr lastNameAr'),
      Evaluation.find({ studentId: req.params.id }).sort({ createdAt: -1 }).limit(5)
        .populate('teacherId', 'firstNameAr lastNameAr'),
      EnrollmentRequest.find({ studentId: req.params.id }).sort({ createdAt: -1 })
        .populate('packageId', 'nameAr price'),
      walletService.getOrCreateWallet(req.params.id),
    ])

    // Self-heal subscription.sessionsRemaining if it fell out of sync with wallet.remaining
    if (subscription && wallet && subscription.sessionsRemaining !== wallet.remaining) {
      subscription.sessionsRemaining = wallet.remaining
      await subscription.save().catch(() => {})
    }

    sendSuccess(res, { student, subscription, recentSessions: sessions, recentEvaluations: evaluations, enrollmentRequests, wallet })
  } catch (err) { next(err) }
}

exports.updateStudent = async (req, res, next) => {
  try {
    if (req.body.studentType !== undefined && !['existing', 'new'].includes(req.body.studentType)) {
      return sendError(res, 'نوع الطالب يجب أن يكون "قديم" أو "جديد"', 400)
    }
    const allowed = ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone', 'isActive', 'bioAr', 'studentType', 'notes']
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
    const searchFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone'])
    const filter = { role: 'teacher' }
    if (req.query.status === 'active') filter.isActive = true
    if (req.query.status === 'inactive') filter.isActive = false
    // Validated against the fixed enum before ever reaching a Mongo filter —
    // req.query values are attacker-controlled strings (or, with array/object
    // query syntax, objects) and must never be trusted as raw filter values
    // (a `?audienceCategory[$ne]=x`-style payload would otherwise inject a
    // Mongo query operator).
    if (req.query.audienceCategory) {
      if (!isValidAudienceCategory(req.query.audienceCategory)) return sendError(res, 'قيمة غير صالحة للفئة', 400)
      filter.audienceCategories = req.query.audienceCategory
    }

    // Combined via $and (not spread into one shared $or) so a name/email
    // search and a specialization filter apply together, not either/or.
    const andConditions = []
    if (searchFilter.$or) andConditions.push(searchFilter)
    // Teaching specialization filter — matches either the legacy singular
    // `category` or the new plural `specializations` (kept in sync, but a
    // filter should never depend on which one happened to be written last).
    if (req.query.specialization) {
      if (!(await isKnownKey(req.query.specialization))) return sendError(res, 'قيمة غير صالحة للتخصص', 400)
      andConditions.push({ $or: [{ category: req.query.specialization }, { specializations: req.query.specialization }] })
    }
    if (andConditions.length) filter.$and = andConditions

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

// Full administrative teacher profile (Phase 2 Part 1 §7): base profile,
// categories/specializations/hourly rate (already on `teacher`), working
// hours, and every currently assigned student with their type, package, and
// live wallet balance (never a fabricated/derived number — read directly
// from LessonWallet, the canonical source, not the Subscription mirror).
exports.getTeacher = async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('-password -refreshToken')
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)

    const [subscriptions, sessions, scheduleRules, workingHours] = await Promise.all([
      Subscription.find({ teacherId: req.params.id, status: 'active' })
        .populate('studentId', 'firstNameAr lastNameAr avatar email phone studentType')
        .populate('packageId', 'nameAr sessionsPerMonth price'),
      Session.find({ teacherId: req.params.id }).sort({ scheduledAt: -1 }).limit(10)
        .populate('studentId', 'firstNameAr lastNameAr'),
      ScheduleRule.find({ teacherId: req.params.id, status: 'active' })
        .populate('studentId', 'firstNameAr lastNameAr avatar studentType'),
      TeacherWorkingHours.findOne({ teacherId: req.params.id }),
    ])

    const studentIds = subscriptions.map((s) => s.studentId?._id).filter(Boolean)
    const wallets = await LessonWallet.find({ studentId: { $in: studentIds } })
    const walletByStudent = new Map(wallets.map((w) => [String(w.studentId), w]))

    const students = subscriptions.map((sub) => ({
      subscriptionId: sub._id,
      student: sub.studentId,
      package: sub.packageId,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      wallet: sub.studentId ? (walletByStudent.get(String(sub.studentId._id)) || null) : null,
    }))

    // A student can have an active recurring schedule (Phase 2 Part 2's
    // assignment-request activation) with no package/subscription yet — the
    // brief explicitly allows scheduling now and adding a package later.
    // Without this, such a student would never appear in "الطلاب المسندون"
    // even though their schedule is real and active — surface them too,
    // deduped against the subscription-based list above.
    const subscribedStudentIds = new Set(studentIds.map((id) => String(id)))
    const seenScheduleOnly = new Set()
    for (const rule of scheduleRules) {
      const student = rule.studentId
      if (!student || subscribedStudentIds.has(String(student._id)) || seenScheduleOnly.has(String(student._id))) continue
      seenScheduleOnly.add(String(student._id))
      students.push({
        subscriptionId: null, student, package: null, status: 'schedule_only',
        startDate: rule.startDate, endDate: rule.endDate || null, wallet: null,
      })
    }

    sendSuccess(res, { teacher, students, recentSessions: sessions, scheduleRules, workingHours })
  } catch (err) { next(err) }
}

// Explicit allow-list for teacher create/update — never spread req.body
// directly into User.create/findOneAndUpdate (mass-assignment risk: role,
// isPrimaryAdmin, permissions, tokenVersion, etc. must never be settable
// from this endpoint). `password` is deliberately NOT in this shared list —
// it's added only on create; changing an existing teacher's password must
// go through adminResetPassword (which also bumps tokenVersion and
// notifies the teacher) rather than this generic update endpoint.
const TEACHER_WRITABLE_FIELDS = [
  'firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone', 'isActive', 'bioAr',
  'specialization', 'salaryPerSession', 'gender', 'category', 'specializations', 'audienceCategories',
  'hourlyRate', 'availableShifts', 'notes', 'meetingLinks',
]

exports.createTeacher = async (req, res, next) => {
  try {
    const normalizedEmail = cleanEmail(req.body.email)
    if (!normalizedEmail) return sendError(res, 'البريد الإلكتروني مطلوب', 400)
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) return sendError(res, 'البريد الإلكتروني مسجل مسبقاً', 409)
    if (req.body.gender !== undefined && !isValidGender(req.body.gender)) {
      return sendError(res, 'يجب تحديد تصنيف المعلم: معلم أو معلمة', 400)
    }
    // Category/specializations, hourly rate, and available shifts are
    // mandatory when creating a teacher (unlike on update, where legacy
    // teachers may still be missing them — see updateTeacher below).
    const specializations = Array.isArray(req.body.specializations) ? req.body.specializations : []
    if (!req.body.category && !specializations.length) {
      return sendError(res, 'يجب تحديد تخصص تدريس واحد على الأقل للمعلم', 400)
    }
    if (req.body.hourlyRate === undefined || req.body.hourlyRate === null || req.body.hourlyRate === '') {
      return sendError(res, 'يجب تحديد سعر ساعة التدريس', 400)
    }
    if (!Array.isArray(req.body.availableShifts) || !req.body.availableShifts.length) {
      return sendError(res, 'يجب تحديد شيفت واحد على الأقل', 400)
    }
    if (req.body.audienceCategories !== undefined && !isValidAudienceCategoriesArray(req.body.audienceCategories)) {
      return sendError(res, 'قائمة الفئات تحتوي على قيمة غير صالحة', 400)
    }
    const profileError = await validateTeacherProfileFields(req.body)
    if (profileError) return sendError(res, profileError, 400)

    // Standalone teacher creation (Phase 2 meeting addendum §1) — routed
    // through the same three-mode credential resolver as every other
    // student/teacher creation flow. Backward-compatible: a legacy flat
    // `password` (or none at all, which used to silently fail User.create's
    // required-field validation) is still accepted via resolveCredentialInput's
    // fallback and now correctly falls back to secure auto-generation.
    let resolved
    try {
      resolved = await resolveCredentialInput(req.body, 'credential', 'teacher')
    } catch (err) {
      if (err instanceof CredentialError || err.status) {
        return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
      }
      throw err
    }

    const fields = {}
    TEACHER_WRITABLE_FIELDS.forEach((f) => { if (req.body[f] !== undefined) fields[f] = req.body[f] })

    if (req.body.generalMeetingLink && typeof req.body.generalMeetingLink === 'string' && req.body.generalMeetingLink.trim()) {
      const gLink = req.body.generalMeetingLink.trim()
      const provider = req.body.generalMeetingProvider || 'zoom'
      const label = req.body.generalMeetingLabel || (provider === 'meet' ? 'Google Meet' : provider === 'zoom' ? 'Zoom' : 'رابط المحاضرات العام')
      fields.meetingLinks = [{
        provider,
        label,
        link: gLink,
      }]
    }

    const user = await User.create({
      ...fields, email: normalizedEmail, role: 'teacher', password: resolved.passwordToStore,
      mustChangePassword: resolved.mustChangePassword, createdBy: req.user._id,
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'admin.create_teacher',
      entity: 'User', entityId: user._id,
      changes: { specializations: user.specializations, audienceCategories: user.audienceCategories, hourlyRate: user.hourlyRate, credentialMode: resolved.mode },
      ip: req.ip,
    })

    const responseData = user.toPublic()
    if (resolved.temporaryPasswordToReturn) responseData.temporaryPassword = resolved.temporaryPasswordToReturn
    sendSuccess(res, responseData, 'تم إنشاء حساب المعلم', 201)
  } catch (err) { next(err) }
}

exports.updateTeacher = async (req, res, next) => {
  try {
    if (req.body.gender !== undefined && req.body.gender !== null && !isValidGender(req.body.gender)) {
      return sendError(res, 'يجب تحديد تصنيف المعلم: معلم أو معلمة', 400)
    }
    // Format/enum validation only — presence isn't enforced here so editing
    // an unrelated field on a legacy teacher who predates this feature never
    // gets blocked (see model comments on category/hourlyRate/availableShifts).
    const profileError = await validateTeacherProfileFields(req.body)
    if (profileError) return sendError(res, profileError, 400)
    const updates = {}
    TEACHER_WRITABLE_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    if (updates.hourlyRate === '') updates.hourlyRate = 0
    if (updates.category === '') updates.category = null

    if (req.body.generalMeetingLink && typeof req.body.generalMeetingLink === 'string' && req.body.generalMeetingLink.trim()) {
      const gLink = req.body.generalMeetingLink.trim()
      const provider = req.body.generalMeetingProvider || 'zoom'
      const label = req.body.generalMeetingLabel || (provider === 'meet' ? 'Google Meet' : provider === 'zoom' ? 'Zoom' : 'رابط المحاضرات العام')
      
      const teacherExisting = await User.findById(req.params.id).select('meetingLinks')
      const existingLinks = teacherExisting?.meetingLinks ? [...teacherExisting.meetingLinks] : []
      const matchIdx = existingLinks.findIndex(l => l.link === gLink)
      if (matchIdx !== -1) existingLinks.splice(matchIdx, 1)
      existingLinks.unshift({ provider, label, link: gLink })
      updates.meetingLinks = existingLinks
    }

    const before = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('hourlyRate category specializations audienceCategories')
    if (!before) return sendError(res, 'المعلم غير موجود', 404)

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'teacher' },
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken')
    if (!user) return sendError(res, 'المعلم غير موجود', 404)

    // Optionally sync general meeting link to active rules & future sessions if requested
    if (req.body.syncToActiveSessions && req.body.generalMeetingLink) {
      const teacherCtrl = require('./teacher.controller')
      await teacherCtrl.executeSyncMeetingLinks({
        teacherId: user._id,
        meetingLink: req.body.generalMeetingLink.trim(),
        meetingProvider: req.body.generalMeetingProvider || 'zoom',
        studentIds: [],
        saveToSavedLinks: false,
        actorId: req.user._id,
        actorRole: req.user.role,
      }).catch((err) => console.error('Failed to auto-sync meeting links on teacher update:', err))
    }

    // hourlyRate is a protected financial field — every change gets its own
    // dedicated, clearly-labeled audit entry in addition to the general
    // update log below, per Part 1's audit requirements.
    if (updates.hourlyRate !== undefined && updates.hourlyRate !== before.hourlyRate) {
      logAction({
        actorId: req.user._id, actorRole: req.user.role, action: 'admin.update_teacher_hourly_rate',
        entity: 'User', entityId: user._id,
        changes: { before: before.hourlyRate, after: updates.hourlyRate }, ip: req.ip,
      })
    }
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'admin.update_teacher',
      entity: 'User', entityId: user._id, changes: updates, ip: req.ip,
    })

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

exports.getSessionStats = async (req, res, next) => {
  try {
    const timezone = await getAcademyTimezone()
    const { start: today, end: todayEnd } = academyDayBounds(new Date(), timezone)

    const [stats] = await Session.aggregate([
      {
        $facet: {
          totalSessions: [{ $count: 'count' }],
          totalCompleted: [{ $match: { status: 'completed' } }, { $count: 'count' }],
          todayTotal: [
            { $match: { scheduledAt: { $gte: today, $lt: todayEnd } } },
            { $count: 'count' },
          ],
          todayCompleted: [
            { $match: { scheduledAt: { $gte: today, $lt: todayEnd }, status: 'completed' } },
            { $count: 'count' },
          ],
          todayScheduled: [
            { $match: { scheduledAt: { $gte: today, $lt: todayEnd }, status: { $in: ['scheduled', 'ongoing'] } } },
            { $count: 'count' },
          ],
          needsAction: [
            {
              $match: {
                $or: [
                  { status: 'missed' },
                  { status: 'scheduled', scheduledAt: { $lt: new Date() } },
                  { teacherAttendanceStatus: 'late' },
                  { payrollStatus: 'review_required' },
                ],
              },
            },
            { $count: 'count' },
          ],
          totalCancelled: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
        },
      },
    ])

    sendSuccess(res, {
      totalSessions: stats?.totalSessions?.[0]?.count || 0,
      totalCompleted: stats?.totalCompleted?.[0]?.count || 0,
      todayTotal: stats?.todayTotal?.[0]?.count || 0,
      todayCompleted: stats?.todayCompleted?.[0]?.count || 0,
      todayScheduled: stats?.todayScheduled?.[0]?.count || 0,
      needsAction: stats?.needsAction?.[0]?.count || 0,
      totalCancelled: stats?.totalCancelled?.[0]?.count || 0,
    })
  } catch (err) { next(err) }
}

exports.getAllSessions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.teacherId) filter.teacherId = req.query.teacherId
    if (req.query.studentId) filter.studentId = req.query.studentId
    if (req.query.payrollStatus) filter.payrollStatus = req.query.payrollStatus

    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim()
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const matchedUsers = await User.find({
        $or: [
          { firstNameAr: regex },
          { lastNameAr: regex },
          { name: regex },
          { email: regex },
          { phone: regex },
        ],
      }).select('_id').lean()
      const userIds = matchedUsers.map(u => u._id)
      filter.$or = [
        { titleAr: regex },
        { studentId: { $in: userIds } },
        { teacherId: { $in: userIds } },
      ]
    }

    if (req.query.dateFrom || req.query.dateTo) {
      filter.scheduledAt = {}
      const timezone = await getAcademyTimezone()
      if (req.query.dateFrom) {
        const bounds = academyDateKeyBounds(req.query.dateFrom, timezone)
        filter.scheduledAt.$gte = bounds ? bounds.start : new Date(req.query.dateFrom)
      }
      if (req.query.dateTo) {
        const bounds = academyDateKeyBounds(req.query.dateTo, timezone)
        if (bounds) filter.scheduledAt.$lt = bounds.end
        else filter.scheduledAt.$lte = new Date(req.query.dateTo)
      }
    } else if (req.query.upcoming === 'true') {
      filter.scheduledAt = { $gte: new Date() }
    }
    const sortDirection = req.query.sortOrder === 'asc' ? 1 : -1
    const [data, total] = await Promise.all([
      Session.find(filter).sort({ scheduledAt: sortDirection }).skip(skip).limit(limit)
        .populate('studentId teacherId', 'firstNameAr lastNameAr avatar email phone studentType'),
      Session.countDocuments(filter),
    ])

    const sessionIds = data.map(s => s._id)
    const [attendances, reports] = await Promise.all([
      Attendance.find({ sessionId: { $in: sessionIds } }).lean(),
      QuranSessionReport.find({ sessionId: { $in: sessionIds } }).select('sessionId status generalEvaluation submittedAt').lean(),
    ])

    const attMap = new Map(attendances.map(a => [a.sessionId.toString(), a]))
    const repMap = new Map(reports.map(r => [r.sessionId.toString(), r]))

    const enrichedData = data.map(s => {
      const sObj = s.toObject ? s.toObject() : s
      const att = attMap.get(s._id.toString())
      const rep = repMap.get(s._id.toString())

      let studentAttendanceStatus = att?.status
      if (!studentAttendanceStatus) {
        if (s.status === 'completed') studentAttendanceStatus = 'present'
        else if (s.status === 'no_show' || s.outcome === 'no_students_attended') studentAttendanceStatus = 'absent'
        else if (s.status === 'cancelled') studentAttendanceStatus = 'excused'
        else studentAttendanceStatus = 'pending'
      }

      return {
        ...sObj,
        attendance: att || null,
        studentAttendanceStatus,
        report: rep || null,
        hasReport: !!rep,
        isReportSubmitted: ['submitted', 'approved'].includes(rep?.status),
      }
    })

    sendPaginated(res, enrichedData, total, page, limit)
  } catch (err) { next(err) }
}

// ── Academic Override ─────────────────────────────────────────────────────────

exports.getStudentAcademics = async (req, res, next) => {
  try {
    const studentId = req.params.studentId
    const [evaluations, attendance, homework, memorization, revision, sessions, quranReports] = await Promise.all([
      Evaluation.find({ studentId }).sort({ createdAt: -1 }).populate('teacherId', 'firstNameAr lastNameAr avatar'),
      Attendance.find({ studentId }).sort({ createdAt: -1 }).populate('sessionId', 'titleAr scheduledAt'),
      Homework.find({ assignedTo: studentId }).sort({ dueDate: -1 }),
      Memorization.find({ studentId }).sort({ createdAt: -1 }).limit(50),
      Revision.find({ studentId }).sort({ createdAt: -1 }).limit(50),
      Session.find({ studentId }).sort({ scheduledAt: -1 }).limit(100).populate('teacherId', 'firstNameAr lastNameAr avatar'),
      QuranSessionReport.find({ studentId }).sort({ createdAt: -1 }).limit(100).populate('teacherId', 'firstNameAr lastNameAr avatar').populate('reviewedBy', 'firstNameAr lastNameAr'),
    ])

    // Map attendance and reports by sessionId for fast consolidation
    const attMap = {}
    attendance.forEach(a => {
      const sId = a.sessionId?._id?.toString() || a.sessionId?.toString()
      if (sId) attMap[sId] = a
    })

    const repMap = {}
    quranReports.forEach(r => {
      const sId = r.sessionId?.toString()
      if (sId) repMap[sId] = r
    })

    // Consolidated chronological stream of sessions with their attendance & Quran reports
    const consolidatedSessions = sessions.map(s => {
      const sObj = s.toObject ? s.toObject() : { ...s }
      const sId = s._id.toString()
      sObj.attendance = attMap[sId] || null
      sObj.report = repMap[sId] || null
      return sObj
    })

    sendSuccess(res, {
      evaluations,
      attendance,
      homework,
      memorization,
      revision,
      sessions,
      quranReports,
      consolidatedSessions,
    })
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
    if (req.query.studentId) filter.studentId = req.query.studentId
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

// Admin: create a new recurring schedule rule for any teacher and student
exports.createScheduleRule = async (req, res, next) => {
  try {
    const {
      teacherId, studentId, subscriptionId, frequency, daysOfWeek, timeOfDay,
      durationMinutes, startDate, endDate, sessionsTotal,
      meetingLink, meetingProvider, titleTemplate, notes,
      packageId, subscriptionDays, subscriptionEndDate, lessonsRemaining, lessonsUsed,
    } = req.body

    if (!teacherId) return sendError(res, 'يجب تحديد المعلم عند إنشاء الجدول', 400)
    if (!studentId) return sendError(res, 'يجب تحديد الطالب عند إنشاء الجدول', 400)
    if (!startDate) return sendError(res, 'تاريخ البدء مطلوب', 400)
    const timezone = req.body.timezone || await getAcademyTimezone()

    const [teacherUser, studentUser] = await Promise.all([
      User.findById(teacherId).select('firstNameAr lastNameAr meetingLinks'),
      User.findById(studentId).select('firstNameAr lastNameAr name'),
    ])

    if (!teacherUser) return sendError(res, 'المعلم المحدد غير موجود', 404)
    if (!studentUser) return sendError(res, 'الطالب المحدد غير موجود', 404)

    const studentName = `${studentUser.firstNameAr || ''} ${studentUser.lastNameAr || ''}`.trim() || studentUser.name || 'طالب'
    const defaultTitle = `حصة ${studentName}`

    // ── Handle Subscription creation or teacher linking ────────────────────
    let resolvedSubscriptionId = subscriptionId
    let createdSubResult = null

    if (packageId) {
      const subDays = Number(subscriptionDays) || undefined
      const subEnd = subscriptionEndDate ? new Date(subscriptionEndDate) : undefined

      const hasLessonsUsed = lessonsUsed !== undefined && lessonsUsed !== null && lessonsUsed !== '' && Number(lessonsUsed) >= 0

      createdSubResult = await createSubscriptionWithOpeningBalance({
        studentId,
        packageId,
        teacherId,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: subEnd,
        remainingDays: subDays,
        notes: notes || 'اشتراك تم تفعيله تلقائياً مع إنشاء الجدول الدوري',
        lessonsUsed: hasLessonsUsed ? Number(lessonsUsed) : undefined,
        lessonsRemaining: !hasLessonsUsed && lessonsRemaining !== undefined ? Number(lessonsRemaining) : undefined,
        durationMinutes: Number(durationMinutes) || 60,
        actorId: req.user._id,
        actorRole: 'admin',
      })
      resolvedSubscriptionId = createdSubResult.subscription._id
    } else if (!resolvedSubscriptionId) {
      // Find existing active subscription for student if any
      const existingSub = await Subscription.findOne({ studentId, status: 'active' }).sort({ createdAt: -1 })
      if (existingSub) {
        resolvedSubscriptionId = existingSub._id
        if (!existingSub.teacherId || String(existingSub.teacherId) !== String(teacherId)) {
          existingSub.teacherId = teacherId
          await existingSub.save().catch(() => {})
        }
      }
    } else {
      const existingSub = await Subscription.findById(resolvedSubscriptionId)
      if (existingSub && (!existingSub.teacherId || String(existingSub.teacherId) !== String(teacherId))) {
        existingSub.teacherId = teacherId
        await existingSub.save().catch(() => {})
      }
    }

    let resolvedMeetingLink = meetingLink || ''
    let resolvedMeetingProvider = meetingProvider || 'zoom'
    if (!resolvedMeetingLink && teacherUser?.meetingLinks?.[0]?.link) {
      resolvedMeetingLink = teacherUser.meetingLinks[0].link
      resolvedMeetingProvider = teacherUser.meetingLinks[0].provider || resolvedMeetingProvider
    }

    let derivedStartingNumber = startingSessionNumber ? Number(startingSessionNumber) : undefined
    if (!derivedStartingNumber && createdSubResult?.used > 0) {
      derivedStartingNumber = createdSubResult.used + 1
    }

    const resolvedSessionsTotal = sessionsTotal
      ? Number(sessionsTotal)
      : (createdSubResult?.remaining !== undefined ? createdSubResult.remaining : undefined)

    const rule = await ScheduleRule.create({
      teacherId,
      studentId,
      subscriptionId: resolvedSubscriptionId,
      frequency: frequency || 'weekly',
      daysOfWeek: daysOfWeek || [],
      timeOfDay: timeOfDay || '18:00',
      durationMinutes: durationMinutes || 60,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      sessionsTotal: resolvedSessionsTotal,
      meetingLink: resolvedMeetingLink,
      meetingProvider: resolvedMeetingProvider,
      titleTemplate: titleTemplate || defaultTitle,
      startingSessionNumber: derivedStartingNumber,
      notes,
      timezone,
    })

    const sessions = await scheduleService.generateSessionsFromRule(rule)

    // Notify Student
    await createNotification({
      userId: studentId,
      titleAr: 'تم إنشاء جدولك الدراسي',
      bodyAr: `تم إنشاء وتفعيل جدول حصصك الدراسية مع المعلم (${teacherUser.firstNameAr} ${teacherUser.lastNameAr}) — ${sessions.length} حصة مجدولة`,
      type: 'schedule',
      priority: 'high',
      relatedId: rule._id,
      actionUrl: '/student/schedule',
    }).catch(() => {})

    // Notify Teacher
    await createNotification({
      userId: teacherId,
      titleAr: 'تم إسناد جدول طالب جديد لك',
      bodyAr: `تم تفعيل جدول دراسي جديد لك مع الطالب (${studentName}) — ${sessions.length} حصة مجدولة`,
      type: 'schedule',
      priority: 'high',
      relatedId: rule._id,
      actionUrl: `/teacher/students/${studentId}`,
    }).catch(() => {})

    await rule.populate([
      { path: 'teacherId', select: 'firstNameAr lastNameAr avatar' },
      { path: 'studentId', select: 'firstNameAr lastNameAr avatar' },
    ])

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.admin_create',
      entity: 'ScheduleRule', entityId: rule._id,
      changes: { teacherId, studentId, sessionCount: sessions.length }, ip: req.ip,
    })

    sendSuccess(res, {
      rule,
      sessions,
      sessionCount: sessions.length,
      subscription: createdSubResult?.subscription || null,
    }, 'تم إنشاء الجدول الدوري وتوليد الحصص بنجاح', 201)
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

    // Keep not-yet-happened generated sessions in sync with the rule (including timeOfDay,
    // durationMinutes, meetingLink, teacherId, studentId) — past/completed sessions are never rewritten.
    const { updatedCount } = await scheduleService.syncFutureSessionsForRule(rule)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.admin_update',
      entity: 'ScheduleRule', entityId: rule._id, changes: { ...updates, syncedSessions: updatedCount }, ip: req.ip,
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

// Admin: Bulk sync / update meeting links for a teacher's students
exports.adminSyncTeacherMeetingLinks = async (req, res, next) => {
  try {
    const { id: teacherId } = req.params
    const { meetingLink, meetingProvider, studentIds, saveToSavedLinks, label } = req.body
    if (!meetingLink || typeof meetingLink !== 'string') {
      return sendError(res, 'رابط الاجتماع مطلوب', 400)
    }

    const teacher = await User.findById(teacherId)
    if (!teacher || teacher.role !== 'teacher') {
      return sendError(res, 'المعلم غير موجود', 404)
    }

    const teacherCtrl = require('./teacher.controller')
    const result = await teacherCtrl.executeSyncMeetingLinks({
      teacherId,
      meetingLink: meetingLink.trim(),
      meetingProvider: meetingProvider || 'zoom',
      studentIds,
      saveToSavedLinks: saveToSavedLinks !== false,
      label: label || 'الرابط العمومي لجميع الحصص',
      actorId: req.user._id,
      actorRole: req.user.role,
    })

    sendSuccess(res, result, 'تم تحديث وتعميم روابط المعلم بنجاح')
  } catch (err) {
    next(err)
  }
}

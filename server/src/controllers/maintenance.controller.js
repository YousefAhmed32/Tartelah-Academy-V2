const User = require('../models/User')
const Session = require('../models/Session')
const ScheduleRule = require('../models/ScheduleRule')
const ScheduleReservationLock = require('../models/ScheduleReservationLock')
const TeacherWorkingHours = require('../models/TeacherWorkingHours')
const AssignmentRequest = require('../models/AssignmentRequest')
const StudentTransfer = require('../models/StudentTransfer')
const TeacherReplacementBatch = require('../models/TeacherReplacementBatch')
const OnboardingSession = require('../models/OnboardingSession')
const OnboardingRequest = require('../models/OnboardingRequest')
const Subscription = require('../models/Subscription')
const SubscriptionPause = require('../models/SubscriptionPause')
const SubscriptionRenewalRequest = require('../models/SubscriptionRenewalRequest')
const EnrollmentRequest = require('../models/EnrollmentRequest')
const LessonWallet = require('../models/LessonWallet')
const LessonTransaction = require('../models/LessonTransaction')
const TeacherPayrollPeriod = require('../models/TeacherPayrollPeriod')
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const Attendance = require('../models/Attendance')
const Evaluation = require('../models/Evaluation')
const Homework = require('../models/Homework')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const QuranSessionReport = require('../models/QuranSessionReport')
const MonthlyTeacherReport = require('../models/MonthlyTeacherReport')
const Survey = require('../models/Survey')
const Notification = require('../models/Notification')
const Package = require('../models/Package')
const Course = require('../models/Course')
const TeachingSubject = require('../models/TeachingSubject')
const Article = require('../models/Article')
const { logAction } = require('../services/audit.service')
const { sendSuccess, sendError } = require('../utils/response')

const CONFIRMATION_PHRASES = ['تصفير ترتيلة', 'RESET_TARTELAH', 'تصفير المنصة']

/**
 * Get pre-flight statistics of records to be cleaned vs protected core data
 */
exports.getMaintenanceStats = async (req, res, next) => {
  try {
    const [
      studentsCount,
      teachersCount,
      sessionsCount,
      subscriptionsCount,
      walletsCount,
      payrollPeriodsCount,
      reportsCount,
      adminsCount,
      packagesCount,
      coursesCount,
      subjectsCount,
      articlesCount,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Session.countDocuments(),
      Subscription.countDocuments(),
      LessonWallet.countDocuments(),
      TeacherPayrollPeriod.countDocuments(),
      QuranSessionReport.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Package.countDocuments(),
      Course.countDocuments(),
      TeachingSubject.countDocuments(),
      Article.countDocuments(),
    ])

    sendSuccess(res, {
      cleanable: {
        studentsCount,
        teachersCount,
        sessionsCount,
        subscriptionsCount,
        walletsCount,
        payrollPeriodsCount,
        reportsCount,
      },
      protected: {
        adminsCount,
        packagesCount,
        coursesCount,
        subjectsCount,
        articlesCount,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Reset all test data (students, teachers, sessions, wallets, payrolls)
 * Completely protects admins, settings, packages, curricula, and marketing articles.
 */
exports.resetPlatformTestData = async (req, res, next) => {
  try {
    const { confirmText } = req.body || {}

    const normalizedConfirm = (confirmText || '').trim()
    if (!CONFIRMATION_PHRASES.includes(normalizedConfirm)) {
      return sendError(
        res,
        'يرجى كتابة نص التأكيد بدقة (تصفير ترتيلة) لإتمام عملية التنظيف بأمان.',
        400
      )
    }

    // Collect non-admin IDs for notification cleanup
    const nonAdminUsers = await User.find({ role: { $in: ['student', 'teacher'] } }).select('_id role').lean()
    const nonAdminIds = nonAdminUsers.map((u) => u._id)

    // Execute bulk deletions safely
    const [
      deletedUsers,
      deletedSessions,
      deletedRules,
      deletedSubs,
      deletedWallets,
      deletedPayrolls,
    ] = await Promise.all([
      User.deleteMany({ role: { $in: ['student', 'teacher'] } }),
      Session.deleteMany({}),
      ScheduleRule.deleteMany({}),
      Subscription.deleteMany({}),
      LessonWallet.deleteMany({}),
      TeacherPayrollPeriod.deleteMany({}),
      // Additional academic & operational cleanup
      ScheduleReservationLock.deleteMany({}),
      TeacherWorkingHours.deleteMany({}),
      AssignmentRequest.deleteMany({}),
      StudentTransfer.deleteMany({}),
      TeacherReplacementBatch.deleteMany({}),
      OnboardingSession.deleteMany({}),
      OnboardingRequest.deleteMany({}),
      SubscriptionPause.deleteMany({}),
      SubscriptionRenewalRequest.deleteMany({}),
      EnrollmentRequest.deleteMany({}),
      LessonTransaction.deleteMany({}),
      TeacherPayrollEntry.deleteMany({}),
      Attendance.deleteMany({}),
      Evaluation.deleteMany({}),
      Homework.deleteMany({}),
      Memorization.deleteMany({}),
      Revision.deleteMany({}),
      QuranSessionReport.deleteMany({}),
      MonthlyTeacherReport.deleteMany({}),
      Survey.deleteMany({}),
      Notification.deleteMany({ userId: { $in: nonAdminIds } }),
    ])

    // Log the maintenance action
    logAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'reset_platform_test_data',
      entity: 'System',
      changes: {
        deletedUsersCount: deletedUsers?.deletedCount || 0,
        deletedSessionsCount: deletedSessions?.deletedCount || 0,
        deletedRulesCount: deletedRules?.deletedCount || 0,
        deletedSubsCount: deletedSubs?.deletedCount || 0,
        deletedWalletsCount: deletedWallets?.deletedCount || 0,
        deletedPayrollsCount: deletedPayrolls?.deletedCount || 0,
      },
      ip: req.ip,
    })

    sendSuccess(
      res,
      {
        deletedUsersCount: deletedUsers?.deletedCount || 0,
        deletedSessionsCount: deletedSessions?.deletedCount || 0,
        deletedRulesCount: deletedRules?.deletedCount || 0,
        deletedSubsCount: deletedSubs?.deletedCount || 0,
        deletedWalletsCount: deletedWallets?.deletedCount || 0,
      },
      'تم تصفير البيانات التجريبية بنجاح. المنصة جاهزة الآن للتشغيل الفعلي على أرضية بيضاء ونظيفة.'
    )
  } catch (err) {
    next(err)
  }
}

/**
 * Permanently delete an individual teacher and their working records
 */
exports.deleteTeacherPermanently = async (req, res, next) => {
  try {
    const { id } = req.params
    const force = req.query?.force === 'true' || req.body?.force === true

    const teacher = await User.findOne({ _id: id, role: 'teacher' })
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)

    // Check active assigned students
    const activeSubsCount = await Subscription.countDocuments({ teacherId: teacher._id, status: 'active' })
    if (activeSubsCount > 0 && !force) {
      return sendError(
        res,
        `لا يمكن حذف المعلم لوجود ${activeSubsCount} طالب مسند إليه حاليًا. يرجى نقل الطلاب أولاً أو تفعيل الحذف الإجباري.`,
        400
      )
    }

    // Clean teacher operational records
    await Promise.all([
      TeacherWorkingHours.deleteMany({ teacherId: teacher._id }),
      ScheduleRule.deleteMany({ teacherId: teacher._id }),
      Session.deleteMany({ teacherId: teacher._id, status: { $in: ['scheduled', 'pending', 'rescheduled'] } }),
      TeacherPayrollPeriod.deleteMany({ teacherId: teacher._id }),
      TeacherPayrollEntry.deleteMany({ teacherId: teacher._id }),
      MonthlyTeacherReport.deleteMany({ teacherId: teacher._id }),
      AssignmentRequest.deleteMany({ teacherId: teacher._id }),
      Notification.deleteMany({ userId: teacher._id }),
      User.deleteOne({ _id: teacher._id }),
    ])

    logAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'permanent_delete_teacher',
      entity: 'User',
      entityId: teacher._id,
      changes: { teacherName: `${teacher.firstNameAr} ${teacher.lastNameAr}`, email: teacher.email },
      ip: req.ip,
    })

    sendSuccess(res, null, 'تم حذف المعلم وكافة سجلاته نهائيًا بنجاح.')
  } catch (err) {
    next(err)
  }
}

/**
 * Permanently delete an individual student and their subscriptions, wallet & records
 */
exports.deleteStudentPermanently = async (req, res, next) => {
  try {
    const { id } = req.params
    const student = await User.findOne({ _id: id, role: 'student' })
    if (!student) return sendError(res, 'الطالب غير موجود', 404)

    await Promise.all([
      Subscription.deleteMany({ studentId: student._id }),
      SubscriptionPause.deleteMany({ studentId: student._id }),
      SubscriptionRenewalRequest.deleteMany({ studentId: student._id }),
      EnrollmentRequest.deleteMany({ studentId: student._id }),
      LessonWallet.deleteMany({ studentId: student._id }),
      LessonTransaction.deleteMany({ studentId: student._id }),
      ScheduleRule.deleteMany({ studentId: student._id }),
      Session.deleteMany({ studentId: student._id }),
      Attendance.deleteMany({ studentId: student._id }),
      Evaluation.deleteMany({ studentId: student._id }),
      Homework.deleteMany({ studentId: student._id }),
      Memorization.deleteMany({ studentId: student._id }),
      Revision.deleteMany({ studentId: student._id }),
      StudentTransfer.deleteMany({ studentId: student._id }),
      Notification.deleteMany({ userId: student._id }),
      User.deleteOne({ _id: student._id }),
    ])

    logAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'permanent_delete_student',
      entity: 'User',
      entityId: student._id,
      changes: { studentName: `${student.firstNameAr} ${student.lastNameAr}`, email: student.email },
      ip: req.ip,
    })

    sendSuccess(res, null, 'تم حذف الطالب وكافة اشتراكاته ومحفظته نهائيًا بنجاح.')
  } catch (err) {
    next(err)
  }
}

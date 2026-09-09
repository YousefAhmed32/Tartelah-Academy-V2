const Session = require('../models/Session')
const Subscription = require('../models/Subscription')
const Evaluation = require('../models/Evaluation')
const User = require('../models/User')
const LessonWallet = require('../models/LessonWallet')
const ScheduleRule = require('../models/ScheduleRule')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const QuranSessionReport = require('../models/QuranSessionReport')
const { createNotifications } = require('../services/notification.service')
const { logAction } = require('../services/audit.service')
const { sendSuccess, sendError } = require('../utils/response')
const { getPagination } = require('../utils/pagination')
const { toPublicTeacher } = require('../utils/teacherPublic')
const { isValidGender } = require('../config/teacherIdentity')
// Dynamic catalog-backed check (replaces the old static allow-list). The
// public directory only ever needs to filter by an ACTIVE subject — an
// archived one has no public teachers newly advertising it anyway, and
// keeping this active-only avoids surfacing a discontinued subject as a
// selectable public filter. See services/teachingSubject.service.js.
const { isValidActiveKey } = require('../services/teachingSubject.service')
const { isValidAudienceCategory } = require('../config/studentAudience')

// ── Public (unauthenticated) teacher directory ───────────────────────────────
// Deliberately separate from /admin/teachers: no salary, email, phone,
// internal notes or admin metadata ever leaves toPublicTeacher().

exports.getPublicTeachers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    // `$ne: 'draft'` also matches every pre-existing teacher (the field is
    // simply undefined there) — a draft only exists mid-way through the
    // incremental onboarding wizard (onboardingSession.service.js) and must
    // never be publicly visible before an admin finalizes it.
    const filter = { role: 'teacher', isActive: true, onboardingStatus: { $ne: 'draft' } }
    if (req.query.gender) {
      if (!isValidGender(req.query.gender)) return sendError(res, 'قيمة غير صالحة لتصنيف المعلم', 400)
      filter.gender = req.query.gender
    }
    if (req.query.specialization) {
      if (!(await isValidActiveKey(req.query.specialization))) return sendError(res, 'قيمة غير صالحة للتخصص', 400)
      filter.specializations = req.query.specialization
    }
    if (req.query.audienceCategory) {
      if (!isValidAudienceCategory(req.query.audienceCategory)) return sendError(res, 'قيمة غير صالحة للفئة', 400)
      filter.audienceCategories = req.query.audienceCategory
    }
    const [teachers, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('firstNameAr lastNameAr gender avatar specialization specializations audienceCategories bioAr createdAt'),
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
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', isActive: true, onboardingStatus: { $ne: 'draft' } })
      .select('firstNameAr lastNameAr gender avatar specialization specializations audienceCategories bioAr createdAt')
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)
    sendSuccess(res, toPublicTeacher(teacher))
  } catch (err) { next(err) }
}

// Rich per-student summary for the teacher's own roster (Phase 2 change
// request #5) — lesson counts, attendance, upcoming/last lesson, wallet
// balance, and latest evaluation note, all in one bounded call so the
// teacher dashboard/students page never needs a per-student round-trip
// (and never needs to leave for a general list to see this). A teacher IS
// authorized to see their own assigned student's balance — this is scoped
// to `teacherId: req.user._id` throughout, never another teacher's roster.
exports.getMyStudents = async (req, res, next) => {
  try {
    const teacherId = req.user._id
    const subs = await Subscription.find({ teacherId, status: 'active' })
      .populate('studentId')
      .populate('packageId', 'nameAr')
    const studentIds = subs.map(s => s.studentId?._id).filter(Boolean)

    // A student can have an active recurring schedule with no subscription
    // yet (see admin.controller.js's getTeacher for the identical rationale)
    // — surface them too instead of silently dropping them from "my students".
    const scheduleOnlyRulesRaw = await ScheduleRule.find({ teacherId, status: 'active', studentId: { $nin: studentIds } })
      .populate('studentId')
    // De-duplicated by student — a student can have more than one active rule.
    const seenScheduleOnly = new Set()
    const scheduleOnlyRules = scheduleOnlyRulesRaw.filter((r) => {
      const key = r.studentId?._id && String(r.studentId._id)
      if (!key || seenScheduleOnly.has(key)) return false
      seenScheduleOnly.add(key)
      return true
    })
    const allStudentIds = [...studentIds, ...scheduleOnlyRules.map(r => r.studentId._id)]

    const now = new Date()
    const [attendanceAgg, wallets, nextSessions, lastSessions, lastEvaluations] = await Promise.all([
      // Attendance rate = completed / (all non-cancelled sessions) with THIS
      // teacher, mirroring student.controller.js's own dashboard definition.
      Session.aggregate([
        { $match: { teacherId, studentId: { $in: allStudentIds }, status: { $ne: 'cancelled' } } },
        { $group: {
          _id: '$studentId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          upcoming: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rescheduled']] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $in: ['$status', ['missed', 'no_show']] }, 1, 0] } },
        } },
      ]),
      LessonWallet.find({ studentId: { $in: allStudentIds } }),
      Session.find({ teacherId, studentId: { $in: allStudentIds }, status: 'scheduled', scheduledAt: { $gte: now } })
        .sort({ scheduledAt: 1 }).select('studentId scheduledAt'),
      Session.find({ teacherId, studentId: { $in: allStudentIds }, scheduledAt: { $lt: now } })
        .sort({ scheduledAt: -1 }).select('studentId scheduledAt status'),
      Evaluation.find({ teacherId, studentId: { $in: allStudentIds } })
        .sort({ createdAt: -1 }).select('studentId score notesAr createdAt'),
    ])

    const attendanceByStudent = new Map(attendanceAgg.map(a => [a._id.toString(), a]))
    const walletByStudent = new Map(wallets.map(w => [String(w.studentId), w]))
    const nextByStudent = new Map()
    for (const s of nextSessions) { const k = String(s.studentId); if (!nextByStudent.has(k)) nextByStudent.set(k, s) }
    const lastByStudent = new Map()
    for (const s of lastSessions) { const k = String(s.studentId); if (!lastByStudent.has(k)) lastByStudent.set(k, s) }
    const evalByStudent = new Map()
    for (const e of lastEvaluations) { const k = String(e.studentId); if (!evalByStudent.has(k)) evalByStudent.set(k, e) }

    function buildEntry(studentDoc, { subscriptionId, packageName, scheduleStatus }) {
      const st = studentDoc?.toPublic ? studentDoc.toPublic() : studentDoc
      if (!st) return null
      const key = st._id.toString()
      const att = attendanceByStudent.get(key)
      const wallet = walletByStudent.get(key)
      const next = nextByStudent.get(key)
      const last = lastByStudent.get(key)
      const lastEval = evalByStudent.get(key)
      return {
        ...st,
        subscriptionId, packageName: packageName || null, scheduleStatus,
        attendanceRate: att && att.total > 0 ? Math.round((att.completed / att.total) * 100) : 0,
        lessonsCompleted: att?.completed || 0, lessonsUpcoming: att?.upcoming || 0,
        lessonsCancelled: att?.cancelled || 0, lessonsMissed: att?.missed || 0,
        walletRemaining: wallet ? wallet.remaining : null,
        nextSession: next ? { scheduledAt: next.scheduledAt } : null,
        lastSession: last ? { scheduledAt: last.scheduledAt, status: last.status } : null,
        lastEvaluation: lastEval ? { score: lastEval.score, notesAr: lastEval.notesAr, createdAt: lastEval.createdAt } : null,
      }
    }

    const students = [
      ...subs.map(s => buildEntry(s.studentId, { subscriptionId: s._id, packageName: s.packageId?.nameAr, scheduleStatus: 'active' })),
      ...scheduleOnlyRules.map(r => buildEntry(r.studentId, { subscriptionId: null, packageName: null, scheduleStatus: 'schedule_only' })),
    ].filter(Boolean)

    sendSuccess(res, students)
  } catch (err) {
    next(err)
  }
}

// Single-student detail for a teacher's own roster (Phase 2 §8). Ownership
// is enforced the same way as getMyStudents' roster scope — an active
// Subscription OR an active ScheduleRule with this teacher — so a teacher
// can never open a student they are not currently assigned to. Unlike the
// admin detail page, this deliberately excludes cross-teacher session/
// evaluation/report history and Subscription pricing — only what this
// teacher needs to teach the student, scoped to teacherId throughout.
exports.getMyStudentDetail = async (req, res, next) => {
  try {
    const teacherId = req.user._id
    const { studentId } = req.params

    const [sub, scheduleRule] = await Promise.all([
      Subscription.findOne({ teacherId, studentId, status: 'active' }).populate('packageId', 'nameAr'),
      ScheduleRule.findOne({ teacherId, studentId, status: 'active' }),
    ])
    if (!sub && !scheduleRule) return sendError(res, 'هذا الطالب غير مسجل ضمن طلابك الحاليين', 403)

    const student = await User.findOne({ _id: studentId, role: 'student' })
    if (!student) return sendError(res, 'الطالب غير موجود', 404)

    const now = new Date()
    const [
      attendanceAgg, wallet, upcomingSessions, recentSessions,
      evaluations, memorizations, revisions, reports,
    ] = await Promise.all([
      Session.aggregate([
        { $match: { teacherId, studentId: student._id, status: { $ne: 'cancelled' } } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $in: ['$status', ['missed', 'no_show']] }, 1, 0] } },
        } },
      ]),
      LessonWallet.findOne({ studentId: student._id }),
      Session.find({ teacherId, studentId: student._id, status: 'scheduled', scheduledAt: { $gte: now } })
        .sort({ scheduledAt: 1 }).limit(5),
      Session.find({ teacherId, studentId: student._id, scheduledAt: { $lt: now } })
        .sort({ scheduledAt: -1 }).limit(10),
      Evaluation.find({ teacherId, studentId: student._id }).sort({ createdAt: -1 }).limit(10),
      Memorization.find({ teacherId, studentId: student._id }).sort({ recordedAt: -1 }).limit(10),
      Revision.find({ teacherId, studentId: student._id }).sort({ recordedAt: -1 }).limit(10),
      QuranSessionReport.find({ teacherId, studentId: student._id }).sort({ createdAt: -1 }).limit(10),
    ])

    const att = attendanceAgg[0] || { total: 0, completed: 0, missed: 0 }

    sendSuccess(res, {
      student: student.toPublic(),
      subscriptionId: sub?._id || null,
      packageName: sub?.packageId?.nameAr || null,
      scheduleStatus: sub ? 'active' : 'schedule_only',
      attendanceRate: att.total > 0 ? Math.round((att.completed / att.total) * 100) : 0,
      lessonsCompleted: att.completed, lessonsMissed: att.missed,
      walletRemaining: wallet ? wallet.remaining : null,
      upcomingSessions, recentSessions, evaluations, memorizations, revisions, reports,
    })
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

/**
 * Shared execution helper for bulk-syncing meeting links across active schedule rules
 * and future sessions. Used by both teacher self-service and admin management.
 */
exports.executeSyncMeetingLinks = async ({
  teacherId,
  meetingLink,
  meetingProvider = 'zoom',
  studentIds,
  saveToSavedLinks = false,
  label,
  actorId,
  actorRole,
}) => {
  let targetStudentIds = Array.isArray(studentIds) ? studentIds.filter(Boolean) : []

  // If no specific students were selected or 'all' is passed, find all active students for this teacher
  if (targetStudentIds.length === 0 || targetStudentIds.includes('all')) {
    const [rulesStudents, futureSessionsStudents] = await Promise.all([
      ScheduleRule.find({ teacherId, status: { $ne: 'ended' } }).distinct('studentId'),
      Session.find({ teacherId, scheduledAt: { $gte: new Date() }, status: 'scheduled' }).distinct('studentId'),
    ])
    const set = new Set([...rulesStudents.map(String), ...futureSessionsStudents.map(String)])
    targetStudentIds = Array.from(set)
  }

  let updatedRulesCount = 0
  let updatedSessionsCount = 0

  if (targetStudentIds.length > 0) {
    const [resRules, resSessions] = await Promise.all([
      ScheduleRule.updateMany(
        { teacherId, studentId: { $in: targetStudentIds }, status: { $ne: 'ended' } },
        { $set: { meetingLink, meetingProvider } }
      ),
      Session.updateMany(
        { teacherId, studentId: { $in: targetStudentIds }, status: 'scheduled', scheduledAt: { $gte: new Date() } },
        { $set: { meetingLink, meetingProvider } }
      ),
    ])
    updatedRulesCount = resRules.modifiedCount
    updatedSessionsCount = resSessions.modifiedCount

    // Send notifications to affected students
    const notifications = targetStudentIds.map(stId => ({
      userId: stId,
      titleAr: 'تحديث رابط الحصص الدراسية',
      bodyAr: 'قام معلمكم بتحديث رابط الحصص الدراسية إلى الرابط الجديد.',
      type: 'session',
      priority: 'high',
      actionUrl: '/student/sessions',
    }))
    await createNotifications(notifications)
  }

  // Optionally save into teacher's saved links (promoted to primary at index 0)
  if (saveToSavedLinks) {
    const teacherUser = await User.findById(teacherId)
    if (teacherUser) {
      if (!teacherUser.meetingLinks) teacherUser.meetingLinks = []
      const existingIdx = teacherUser.meetingLinks.findIndex((l) => l.link === meetingLink)
      if (existingIdx !== -1) {
        teacherUser.meetingLinks.splice(existingIdx, 1)
      }
      teacherUser.meetingLinks.unshift({
        provider: meetingProvider,
        label: label || (meetingProvider === 'meet' ? 'Google Meet' : meetingProvider === 'zoom' ? 'Zoom' : 'رابط المحاضرات العام'),
        link: meetingLink,
        _id: new (require('mongoose').Types.ObjectId)(),
      })
      await teacherUser.save()
    }
  }

  logAction({
    actorId,
    actorRole,
    action: 'teacher.bulk_sync_meeting_links',
    entity: 'User',
    entityId: teacherId,
    changes: {
      meetingLink,
      meetingProvider,
      affectedStudentsCount: targetStudentIds.length,
      updatedRulesCount,
      updatedSessionsCount,
    },
  })

  return {
    updatedRulesCount,
    updatedSessionsCount,
    affectedStudentsCount: targetStudentIds.length,
  }
}

// Teacher: Bulk sync / update meeting link across all or selected students
exports.syncMeetingLinks = async (req, res, next) => {
  try {
    const { meetingLink, meetingProvider, studentIds, saveToSavedLinks, label } = req.body
    if (!meetingLink || typeof meetingLink !== 'string') {
      return sendError(res, 'رابط الاجتماع مطلوب', 400)
    }

    const teacherId = req.user._id
    const result = await exports.executeSyncMeetingLinks({
      teacherId,
      meetingLink: meetingLink.trim(),
      meetingProvider: meetingProvider || 'zoom',
      studentIds,
      saveToSavedLinks: !!saveToSavedLinks,
      label,
      actorId: req.user._id,
      actorRole: req.user.role,
    })

    sendSuccess(res, result, 'تم تحديث وتعميم روابط الحصص بنجاح')
  } catch (err) {
    next(err)
  }
}

const Session = require('../models/Session')
const Attendance = require('../models/Attendance')
const Evaluation = require('../models/Evaluation')
const Homework = require('../models/Homework')
const User = require('../models/User')
const { createNotification, createNotifications } = require('../services/notification.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')
const { classifyCheckIn, getSessionWindow } = require('../config/attendancePolicy')
const { computePayrollStatus, computeConfidence, assessSessionReview, getLessonTimelineLabel } = require('../services/sessionIntelligence.service')
const { logAction } = require('../services/audit.service')
const lessonDeduction = require('../services/lessonDeduction.service')
const payrollLedger = require('../services/payrollLedger.service')
const bookingService = require('../services/booking.service')

function isOwnerOrAdmin(session, user) {
  return user.role === 'admin' || session.teacherId.toString() === user._id.toString()
}

// Applies the system-computed payroll status unless an admin has already
// made a durable manual decision — once payrollStatusSetBy is 'admin', the
// session is never silently overwritten by automatic recomputation. Also
// records the persisted payroll-ledger artifact (see payrollLedger.service.js)
// so a payroll run has something real to read instead of a live recount.
async function applySystemPayrollStatus(session) {
  if (session.payrollStatusSetBy === 'admin') return
  const { payrollStatus, reason } = computePayrollStatus(session)
  session.payrollStatus = payrollStatus
  session.payrollStatusReason = reason
  session.payrollStatusSetBy = 'system'
  session.payrollStatusSetAt = new Date()
  await payrollLedger.recordEntry(session, { payrollStatus, reason })
}

const ATTENDANCE_STATUS_LABEL_AR = {
  present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'معذور',
  left_early: 'غادر مبكراً', technical_issue: 'مشكلة تقنية',
}

exports.createSession = async (req, res, next) => {
  try {
    const { studentId, titleAr, scheduledAt, durationMinutes, meetingLink, meetingProvider, notes, isMakeup } = req.body
    const teacherId = req.user._id
    await bookingService.assertNoConflict({ teacherId, studentId, scheduledAt, durationMinutes: durationMinutes || 60 })
    const session = await Session.create({
      studentId, teacherId, titleAr, scheduledAt, durationMinutes,
      meetingLink, meetingProvider, notes,
      isMakeup: isMakeup || false,
      isException: true,
    })
    await session.populate(['studentId', 'teacherId'])
    await createNotification({
      userId: studentId,
      titleAr: 'حصة جديدة مجدولة',
      bodyAr: `تم جدولة حصة "${titleAr}" في ${new Date(scheduledAt).toLocaleDateString('ar')}`,
      type: 'session',
      priority: 'medium',
      relatedId: session._id,
      actionUrl: '/student/sessions',
    })
    sendSuccess(res, session, 'تمت جدولة الحصة بنجاح', 201)
  } catch (err) {
    if (err.name === 'BookingConflictError') return sendError(res, err.message, err.statusCode, { conflictingSessionId: err.conflictingSessionId })
    next(err)
  }
}

exports.getSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('studentId', 'firstNameAr lastNameAr avatar email phone')
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    const attendance = await Attendance.findOne({ sessionId: session._id, studentId: session.studentId })
    const window = getSessionWindow(session.scheduledAt, session.durationMinutes)
    const confidence = computeConfidence(session, attendance)
    const reviewAssessment = req.user.role === 'admin' ? assessSessionReview(session, attendance) : null
    const timeline = getLessonTimelineLabel(session, attendance)
    sendSuccess(res, { ...session.toObject(), attendance: attendance || null, window, confidence, reviewAssessment, timeline })
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
    const sessions = await Session.find(filter).sort({ scheduledAt: 1 }).limit(50)
      .populate('studentId teacherId', 'firstNameAr lastNameAr avatar')
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
      Session.find(filter).sort({ scheduledAt: -1 }).skip(skip).limit(limit)
        .populate('studentId teacherId', 'firstNameAr lastNameAr avatar'),
      Session.countDocuments(filter),
    ])
    sendPaginated(res, sessions, total, page, limit)
  } catch (err) {
    next(err)
  }
}

exports.getTeacherSessionsByMonth = async (req, res, next) => {
  try {
    const { year, month, studentId } = req.query
    const y = parseInt(year) || new Date().getFullYear()
    const m = parseInt(month) || (new Date().getMonth() + 1)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59, 999)

    const filter = {
      teacherId: req.user._id,
      scheduledAt: { $gte: start, $lte: end },
    }
    if (studentId) filter.studentId = studentId

    const sessions = await Session.find(filter)
      .sort({ scheduledAt: 1 })
      .populate('studentId', 'firstNameAr lastNameAr avatar email')

    // Attach the computed window/phase so the UI can show forgiving,
    // human-readable operational state without re-deriving policy math.
    const now = new Date()
    const withWindow = sessions.map(s => ({
      ...s.toObject(),
      window: getSessionWindow(s.scheduledAt, s.durationMinutes, now),
    }))

    sendSuccess(res, withWindow)
  } catch (err) {
    next(err)
  }
}

// Teacher platform check-in — records that the teacher declared readiness
// through the academy at this moment. This does NOT prove the teacher
// joined the external Zoom/Meet/Teams call — see models/Session.js comment.
// Allowed even if the sweep job already soft-flagged the session as
// missed/no_show: a late self check-in is strictly better evidence than a
// system guess, and the platform must never lock a teacher out just because
// time passed (see attendancePolicy.js — soft windows, not hard punishment).
exports.startSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (!isOwnerOrAdmin(session, req.user)) return sendError(res, 'غير مصرح', 403)
    if (!['scheduled', 'missed', 'no_show'].includes(session.status)) {
      return sendError(res, 'لا يمكن بدء هذه الحصة', 400)
    }

    const wasAutoFlagged = session.status === 'missed' || session.status === 'no_show'
    const now = new Date()
    const { status, lateMinutes } = classifyCheckIn(session.scheduledAt, now)

    session.status = 'ongoing'
    session.teacherStartedAt = now
    session.teacherAttendanceStatus = status
    session.teacherLateMinutes = lateMinutes
    session.teacherAttendanceMarkedBy = 'teacher'
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.check_in',
      entity: 'Session', entityId: session._id,
      changes: { status, lateMinutes, selfResolvedFromAutoFlag: wasAutoFlagged },
      ip: req.ip,
    })

    if (status === 'late') {
      await createNotification({
        userId: session.teacherId,
        titleAr: 'تأخرت في بدء الحصة',
        bodyAr: `بدأت حصة "${session.titleAr}" متأخراً بـ ${lateMinutes} دقيقة`,
        type: 'attendance',
        priority: 'medium',
        relatedId: session._id,
        actionUrl: '/teacher/attendance',
      })
    }

    sendSuccess(res, session, 'تم تسجيل حضورك للحصة')
  } catch (err) {
    next(err)
  }
}

// Records that someone opened the external meeting link through the
// platform. Evidence only — a click is never treated as proof of actual
// meeting participation.
exports.recordLinkOpened = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    const userId = req.user._id.toString()
    const isTeacher = session.teacherId.toString() === userId
    const isStudent = session.studentId.toString() === userId
    if (!isTeacher && !isStudent && req.user.role !== 'admin') return sendError(res, 'غير مصرح', 403)
    if (!session.meetingLink) return sendError(res, 'لا يوجد رابط اجتماع لهذه الحصة بعد', 400)

    const now = new Date()
    if (isTeacher || req.user.role === 'admin') session.teacherLinkOpenedAt = now
    if (isStudent) session.studentLinkOpenedAt = now
    await session.save()

    sendSuccess(res, { meetingLink: session.meetingLink, openedAt: now }, 'تم فتح رابط الحصة')
  } catch (err) {
    next(err)
  }
}

// Reports that a session started later than scheduled without a full
// reschedule — e.g. the teacher or student was a bit late, the previous
// session overran, or there was a short technical delay. Preserves the
// original schedule; stores the real timing alongside it.
exports.reportDelay = async (req, res, next) => {
  try {
    const { actualStartAt, delayReasonCode, delayNote } = req.body
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (!isOwnerOrAdmin(session, req.user)) return sendError(res, 'غير مصرح', 403)

    const actual = actualStartAt ? new Date(actualStartAt) : new Date()
    session.actualStartAt = actual
    session.delayMinutes = Math.max(0, Math.round((actual.getTime() - new Date(session.scheduledAt).getTime()) / 60000))
    if (delayReasonCode) session.delayReasonCode = delayReasonCode
    if (delayNote !== undefined) session.delayNote = delayNote
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.report_delay',
      entity: 'Session', entityId: session._id,
      changes: { delayMinutes: session.delayMinutes, delayReasonCode }, ip: req.ip,
    })

    sendSuccess(res, session, 'تم تسجيل تأخر الحصة')
  } catch (err) {
    next(err)
  }
}

exports.completeSession = async (req, res, next) => {
  try {
    const { outcome } = req.body
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (!isOwnerOrAdmin(session, req.user)) return sendError(res, 'غير مصرح', 403)
    if (session.status === 'completed') return sendError(res, 'تم إكمال هذه الحصة بالفعل', 400)

    session.status = 'completed'
    session.completedAt = new Date()
    if (!session.actualEndAt) session.actualEndAt = session.completedAt
    session.outcome = outcome && outcome !== 'pending_review' ? outcome : 'delivered'

    // Fallback: if the teacher completed the session without ever calling
    // /start (older clients, or direct completion), infer punctuality from
    // the completion timestamp so attendance data stays populated.
    if (session.teacherAttendanceStatus === 'pending') {
      const { status, lateMinutes } = classifyCheckIn(session.scheduledAt, session.completedAt)
      session.teacherAttendanceStatus = status
      session.teacherLateMinutes = lateMinutes
      session.teacherAttendanceMarkedBy = 'system'
    }

    await applySystemPayrollStatus(session)

    // Only auto-create attendance as an unconfirmed 'present' draft if not
    // already recorded — this is NOT the same as the teacher explicitly
    // finalizing attendance (isFinalized stays false). If the caller already
    // told us no student attended, default the draft to 'absent' instead of
    // silently assuming presence.
    let attendance = await Attendance.findOne({ sessionId: session._id })
    if (!attendance) {
      attendance = await Attendance.create({
        sessionId: session._id,
        studentId: session.studentId,
        teacherId: session.teacherId,
        status: session.outcome === 'no_students_attended' ? 'absent' : 'present',
        recordedAt: new Date(),
        isFinalized: false,
      })
    }

    // Wallet consumption follows the student's recorded attendance — see
    // lessonDeduction.service.js for the full deduction matrix (present/
    // late/left_early/absent all consume a lesson, excused/technical_issue
    // don't).
    await lessonDeduction.syncLessonConsumption(session, attendance.status, { performedByRole: req.user.role, performedBy: req.user._id })
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.complete',
      entity: 'Session', entityId: session._id,
      changes: { outcome: session.outcome, payrollStatus: session.payrollStatus }, ip: req.ip,
    })

    sendSuccess(res, session, 'تم إكمال الحصة')
  } catch (err) {
    next(err)
  }
}

// One-click "finish session" for the teacher's primary workflow (Start →
// Teach → Finish): bundles attendance, teacher notes, an optional
// evaluation and an optional homework assignment with completing the
// session itself, all in a single request — so the teacher never has to
// juggle several separate screens/mutations, and the platform never ends
// up with a session marked complete but no attendance recorded (or vice
// versa). Reuses the exact same completion/payroll/subscription logic as
// completeSession above.
const FINISH_ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused', 'left_early', 'technical_issue']

exports.finishSession = async (req, res, next) => {
  try {
    const { attendanceStatus, attendanceNotes, arrivalTime, teacherNotes, homework, evaluation } = req.body
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (!isOwnerOrAdmin(session, req.user)) return sendError(res, 'غير مصرح', 403)
    if (session.status === 'completed') return sendError(res, 'تم إكمال هذه الحصة بالفعل', 400)
    if (session.status === 'cancelled') return sendError(res, 'لا يمكن إنهاء حصة ملغاة', 400)
    if (!attendanceStatus || !FINISH_ATTENDANCE_STATUSES.includes(attendanceStatus)) {
      return sendError(res, 'حالة حضور الطالب مطلوبة', 400)
    }

    const now = new Date()

    // 1) Attendance — finalized immediately (this IS the teacher's confirmed record).
    const attendance = await Attendance.findOneAndUpdate(
      { sessionId: session._id, studentId: session.studentId },
      {
        sessionId: session._id, studentId: session.studentId, teacherId: session.teacherId,
        status: attendanceStatus, notes: attendanceNotes || '',
        arrivalTime: attendanceStatus === 'late' && arrivalTime ? new Date(arrivalTime) : undefined,
        recordedAt: now, isFinalized: true, finalizedAt: now, finalizedBy: req.user._id,
      },
      { upsert: true, new: true }
    )

    // 2) Session completion — same fields/derivations as completeSession.
    if (teacherNotes !== undefined) session.teacherNotes = teacherNotes
    session.status = 'completed'
    session.completedAt = now
    if (!session.actualEndAt) session.actualEndAt = now
    session.outcome = attendanceStatus === 'absent' ? 'no_students_attended' : 'delivered'
    if (session.teacherAttendanceStatus === 'pending') {
      const { status, lateMinutes } = classifyCheckIn(session.scheduledAt, now)
      session.teacherAttendanceStatus = status
      session.teacherLateMinutes = lateMinutes
      session.teacherAttendanceMarkedBy = 'system'
    }
    session.attendanceFinalizedAt = now
    session.attendanceFinalizedBy = req.user._id
    await applySystemPayrollStatus(session)

    // Wallet consumption follows the student's recorded attendance — see
    // lessonDeduction.service.js for the full deduction matrix.
    await lessonDeduction.syncLessonConsumption(session, attendanceStatus, { performedByRole: req.user.role, performedBy: req.user._id })
    await session.save()

    // 3) Optional evaluation.
    let createdEvaluation = null
    if (evaluation && evaluation.score) {
      createdEvaluation = await Evaluation.create({
        studentId: session.studentId, teacherId: session.teacherId, sessionId: session._id,
        type: evaluation.type || 'general', score: evaluation.score, notesAr: evaluation.notesAr,
      })
      await createNotification({
        userId: session.studentId,
        titleAr: 'تقييم جديد',
        bodyAr: `أضاف معلمك تقييماً جديداً بدرجة ${evaluation.score}/10`,
        type: 'evaluation', priority: 'medium', relatedId: createdEvaluation._id,
        actionUrl: '/student/evaluations',
      })
    }

    // 4) Optional homework.
    let createdHomework = null
    if (homework && homework.titleAr && homework.dueDate) {
      createdHomework = await Homework.create({
        teacherId: session.teacherId, titleAr: homework.titleAr,
        descriptionAr: homework.descriptionAr, dueDate: homework.dueDate,
        assignedTo: [session.studentId],
      })
      await createNotification({
        userId: session.studentId,
        titleAr: 'واجب جديد',
        bodyAr: `تم تعيين واجب: "${homework.titleAr}"`,
        type: 'homework', priority: 'medium', relatedId: createdHomework._id,
        actionUrl: '/student/homework',
      })
    }

    // 5) Notify the student the session wrapped up, with their recorded attendance.
    await createNotification({
      userId: session.studentId,
      titleAr: 'انتهت الحصة',
      bodyAr: `انتهت حصة "${session.titleAr}" — تم تسجيل حضورك: ${ATTENDANCE_STATUS_LABEL_AR[attendanceStatus] || attendanceStatus}`,
      type: 'session', priority: 'low', relatedId: session._id,
      actionUrl: '/student/sessions',
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.finish',
      entity: 'Session', entityId: session._id,
      changes: {
        attendanceStatus, outcome: session.outcome, payrollStatus: session.payrollStatus,
        evaluationCreated: !!createdEvaluation, homeworkCreated: !!createdHomework,
      }, ip: req.ip,
    })

    sendSuccess(res, { session, attendance, evaluation: createdEvaluation, homework: createdHomework }, 'تم حفظ الحصة وإنهاؤها بنجاح')
  } catch (err) {
    next(err)
  }
}

// Official cancellation — only possible BEFORE a session has started
// (teacher, admin, or — as of the Lesson Wallet redesign — the student
// themself). Requires an explicit reason. Wallet impact depends on WHO
// cancelled and, for students, WHEN — see lessonDeduction.service.js
// handleCancellation for the full before/after-window rule.
const CANCELLABLE_STATUSES = ['scheduled', 'missed', 'no_show']

exports.cancelSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    const isAdmin = req.user.role === 'admin'
    const isTeacherOwner = req.user.role === 'teacher' && session.teacherId.toString() === req.user._id.toString()
    const isStudentOwner = req.user.role === 'student' && session.studentId.toString() === req.user._id.toString()
    if (!isAdmin && !isTeacherOwner && !isStudentOwner) return sendError(res, 'غير مصرح', 403)

    if (!CANCELLABLE_STATUSES.includes(session.status)) {
      return sendError(res, 'لا يمكن إلغاء حصة بدأت أو اكتملت بالفعل', 400)
    }
    const reason = (req.body.reason || '').trim()
    if (!reason) return sendError(res, 'سبب الإلغاء مطلوب', 400)

    // Effective cancelling party for wallet/outcome purposes: the student
    // themself, or an admin explicitly acting on the student's behalf
    // (req.body.cancelledByRole:'student'), or the teacher/admin otherwise.
    const cancelledByRole = isStudentOwner
      ? 'student'
      : (isAdmin && req.body.cancelledByRole === 'student' ? 'student' : (isAdmin ? 'admin' : 'teacher'))

    session.status = 'cancelled'
    session.cancelledAt = new Date()
    session.cancelReason = reason
    session.cancelledBy = req.user._id
    session.outcome = cancelledByRole === 'student'
      ? 'cancelled_by_student'
      : (cancelledByRole === 'admin' ? 'cancelled_by_admin' : 'cancelled_by_teacher')
    if (session.payrollStatusSetBy !== 'admin') {
      session.payrollStatus = 'excluded'
      session.payrollStatusReason = 'الحصة ملغاة'
      session.payrollStatusSetBy = 'system'
      session.payrollStatusSetAt = new Date()
    }

    const walletImpact = await lessonDeduction.handleCancellation(session, {
      cancelledByRole, now: new Date(), reason, performedBy: req.user._id,
    })
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.cancel',
      entity: 'Session', entityId: session._id,
      changes: { reason: session.cancelReason, outcome: session.outcome, walletImpact }, ip: req.ip,
    })

    await createNotification({
      userId: session.studentId,
      titleAr: 'تم إلغاء الحصة',
      bodyAr: `تم إلغاء حصة "${session.titleAr}"${session.cancelReason ? ` — ${session.cancelReason}` : ''}`,
      type: 'session',
      priority: 'high',
      relatedId: session._id,
      actionUrl: '/student/sessions',
    })

    sendSuccess(res, session, 'تم إلغاء الحصة')
  } catch (err) {
    next(err)
  }
}

exports.rescheduleSession = async (req, res, next) => {
  try {
    const { newDate } = req.body
    if (!newDate) return sendError(res, 'التاريخ الجديد مطلوب', 400)
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    const isAdmin = req.user.role === 'admin'
    if (!isAdmin && session.teacherId.toString() !== req.user._id.toString()) return sendError(res, 'غير مصرح', 403)
    await bookingService.assertNoConflict({
      teacherId: session.teacherId, studentId: session.studentId,
      scheduledAt: newDate, durationMinutes: session.durationMinutes, excludeSessionId: session._id,
    })
    const previousDate = session.scheduledAt
    session.rescheduledFrom = session.scheduledAt
    session.scheduledAt = new Date(newDate)
    session.status = 'scheduled'
    session.isException = true
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.reschedule',
      entity: 'Session', entityId: session._id,
      changes: { from: previousDate, to: session.scheduledAt }, ip: req.ip,
    })

    await createNotification({
      userId: session.studentId,
      titleAr: 'تم إعادة جدولة الحصة',
      bodyAr: `تم تغيير موعد حصة "${session.titleAr}" إلى ${new Date(newDate).toLocaleDateString('ar')}`,
      type: 'session',
      priority: 'high',
      relatedId: session._id,
      actionUrl: '/student/sessions',
    })

    sendSuccess(res, session, 'تم إعادة جدولة الحصة')
  } catch (err) {
    if (err.name === 'BookingConflictError') return sendError(res, err.message, err.statusCode, { conflictingSessionId: err.conflictingSessionId })
    next(err)
  }
}

exports.getTeacherSessions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const [sessions, total] = await Promise.all([
      Session.find({ teacherId: req.user._id })
        .sort({ scheduledAt: -1 }).skip(skip).limit(limit)
        .populate('studentId', 'firstNameAr lastNameAr avatar'),
      Session.countDocuments({ teacherId: req.user._id }),
    ])
    sendPaginated(res, sessions, total, page, limit)
  } catch (err) {
    next(err)
  }
}

// Admin: update any session fields (meeting link, notes, reassign, etc.)
exports.adminUpdateSession = async (req, res, next) => {
  try {
    const allowed = ['titleAr', 'scheduledAt', 'durationMinutes', 'meetingLink', 'meetingProvider', 'notes', 'teacherNotes', 'status', 'studentId', 'teacherId']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const session = await Session.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('studentId teacherId', 'firstNameAr lastNameAr avatar email')
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.admin_update',
      entity: 'Session', entityId: session._id, changes: updates, ip: req.ip,
    })

    sendSuccess(res, session, 'تم تحديث الحصة')
  } catch (err) {
    next(err)
  }
}

// Admin: create session (can assign any teacher/student)
exports.adminCreateSession = async (req, res, next) => {
  try {
    const { studentId, teacherId, titleAr, scheduledAt, durationMinutes, meetingLink, meetingProvider, notes, isMakeup } = req.body
    await bookingService.assertNoConflict({ teacherId, studentId, scheduledAt, durationMinutes: durationMinutes || 60 })
    const session = await Session.create({
      studentId, teacherId, titleAr, scheduledAt,
      durationMinutes: durationMinutes || 60,
      meetingLink, meetingProvider, notes,
      isMakeup: isMakeup || false,
      isException: true,
    })
    await session.populate('studentId teacherId', 'firstNameAr lastNameAr avatar')

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.admin_create',
      entity: 'Session', entityId: session._id, changes: { studentId, teacherId, scheduledAt }, ip: req.ip,
    })

    await createNotification({
      userId: studentId,
      titleAr: 'حصة جديدة مجدولة',
      bodyAr: `تم جدولة حصة "${titleAr}" في ${new Date(scheduledAt).toLocaleDateString('ar')}`,
      type: 'session', priority: 'medium', relatedId: session._id,
      actionUrl: '/student/sessions',
    })
    await createNotification({
      userId: teacherId,
      titleAr: 'حصة جديدة مجدولة',
      bodyAr: `تم جدولة حصة "${titleAr}" مع طالب في ${new Date(scheduledAt).toLocaleDateString('ar')}`,
      type: 'session', priority: 'medium', relatedId: session._id,
      actionUrl: '/teacher/sessions',
    })
    sendSuccess(res, session, 'تمت جدولة الحصة بنجاح', 201)
  } catch (err) {
    if (err.name === 'BookingConflictError') return sendError(res, err.message, err.statusCode, { conflictingSessionId: err.conflictingSessionId })
    next(err)
  }
}

// Teacher: accept or decline an assigned lesson. Only meaningful when the
// session was created with teacherAcceptanceStatus:'pending' (opt-in — a
// normal session, which defaults to 'not_required', is unaffected and needs
// no acceptance step, preserving today's behavior for existing flows).
exports.acceptSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (session.teacherId.toString() !== req.user._id.toString()) return sendError(res, 'غير مصرح', 403)
    if (session.teacherAcceptanceStatus !== 'pending') return sendError(res, 'لا تحتاج هذه الحصة لموافقة', 400)

    session.teacherAcceptanceStatus = 'accepted'
    session.teacherAcceptanceRespondedAt = new Date()
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.accept',
      entity: 'Session', entityId: session._id, ip: req.ip,
    })

    sendSuccess(res, session, 'تم قبول الحصة')
  } catch (err) {
    next(err)
  }
}

exports.declineSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (session.teacherId.toString() !== req.user._id.toString()) return sendError(res, 'غير مصرح', 403)
    if (session.teacherAcceptanceStatus !== 'pending') return sendError(res, 'لا تحتاج هذه الحصة لموافقة', 400)

    session.teacherAcceptanceStatus = 'declined'
    session.teacherAcceptanceRespondedAt = new Date()
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.decline',
      entity: 'Session', entityId: session._id, changes: { reason: req.body.reason }, ip: req.ip,
    })

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    if (admins.length) {
      await createNotifications(admins.map(admin => ({
        userId: admin._id,
        titleAr: 'رفض معلم لحصة',
        bodyAr: `رفض المعلم حصة "${session.titleAr}"${req.body.reason ? ` — ${req.body.reason}` : ''} — تحتاج لإعادة تعيين`,
        type: 'session', priority: 'high', relatedId: session._id,
        actionUrl: '/admin/sessions',
      })))
    }

    sendSuccess(res, session, 'تم رفض الحصة وتنبيه الإدارة')
  } catch (err) {
    next(err)
  }
}

// Admin: delete a session permanently
exports.adminDeleteSession = async (req, res, next) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'session.admin_delete',
      entity: 'Session', entityId: session._id, ip: req.ip,
    })

    sendSuccess(res, null, 'تم حذف الحصة')
  } catch (err) {
    next(err)
  }
}

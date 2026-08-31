// Incremental, resumable "create a teacher with their students" onboarding
// (Phase 2 Part 2c). This is a NEW, additive flow that fixes the multi-
// student duplicate-suggestion/double-booking bug in the old one-shot
// wizard: there, every student lived only in frontend state until one final
// submit, so Student 2's availability check never saw Student 1's
// already-chosen schedule. Here, each student is validated, persisted, and
// their schedule reserved (via assignmentService.createAssignmentRequest,
// which acquires a ScheduleReservationLock) in its OWN request/response
// cycle — so by the time Student 2 is being scheduled, Student 1 already has
// a real AssignmentRequest/ScheduleRule row in the database, and the
// availability engine (services/availability.service.js) naturally excludes
// it. The teacher is saved first, before any student, and is marked
// `onboardingStatus: 'draft'` (hidden from the public directory and blocked
// from login) until the whole session is finalized.
//
// `services/onboarding.service.js` and its `createTeacherWithStudents`
// one-shot endpoint are left FULLY INTACT for backward compatibility — this
// is a parallel system for the same job, not a replacement, and the two
// never write conflicting state (a session created here never touches
// OnboardingRequest, and vice versa).
//
// MongoDB here is a standalone mongod (no multi-document transactions — see
// wallet.service.js/onboarding.service.js for the documented rationale).
// Every write below follows the same established pattern: validate first (no
// writes), write while tracking only what THIS call created, and on failure
// roll back exactly that — a failed Student 2 save must never delete the
// teacher or Student 1.
const User = require('../models/User')
const TeacherWorkingHours = require('../models/TeacherWorkingHours')
const OnboardingSession = require('../models/OnboardingSession')
const AssignmentRequest = require('../models/AssignmentRequest')
const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const Subscription = require('../models/Subscription')
const LessonWallet = require('../models/LessonWallet')
const LessonTransaction = require('../models/LessonTransaction')
const { logAction } = require('./audit.service')
const { createSubscriptionWithOpeningBalance } = require('./subscription.service')
const assignmentService = require('./assignment.service')
const { buildDefaultWorkingHours } = require('../config/workingHours')
const { resolveCredentialInput } = require('../config/credentialMode')
const {
  OnboardingError, TEACHER_ALLOWED_FIELDS, STUDENT_ALLOWED_FIELDS,
  validateTeacherPayload, validateWorkingHoursPayload, validateStudentsPayload,
  assertPackagesValid, normalizeEmail, pickAllowed,
} = require('./onboarding.service')

// ── Shared: backend-authoritative student summary (used by resume + review;
// review MUST reload from here, never trust local wizard state) ───────────
async function buildStudentSummary(studentId) {
  const student = await User.findById(studentId)
  if (!student) return null
  const [subscription, assignmentRequest] = await Promise.all([
    Subscription.findOne({ studentId }).sort({ createdAt: -1 }).populate('packageId', 'nameAr sessionsPerMonth'),
    AssignmentRequest.findOne({ studentId }).sort({ createdAt: -1 }),
  ])
  const wallet = subscription ? await LessonWallet.findOne({ studentId }) : null
  return {
    student: student.toPublic(),
    subscription: subscription || null,
    openingBalance: wallet ? { used: wallet.totalUsed, remaining: wallet.remaining } : null,
    assignmentRequest: assignmentRequest ? {
      _id: assignmentRequest._id, status: assignmentRequest.status,
      schedule: assignmentRequest.schedule, lessonDurationMinutes: assignmentRequest.lessonDurationMinutes,
      teachingType: assignmentRequest.teachingType, specialization: assignmentRequest.specialization,
      requiresTeacherApproval: assignmentRequest.status === 'pending_teacher_approval',
      teacherResponse: assignmentRequest.teacherResponse || null,
    } : null,
  }
}

// ── Start (idempotent) — the teacher must exist before any student can be
// added; every subsequent "Next"/reload reuses this same session+teacher. ─
async function startOnboardingSession({ clientRequestId, teacher, workingHours, actorId, actorRole = 'admin' }) {
  const safeClientRequestId = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim() : null
  if (!safeClientRequestId) throw new OnboardingError('معرف الطلب (clientRequestId) مطلوب', 400, 'clientRequestId')

  const existingSession = await OnboardingSession.findOne({ clientRequestId: safeClientRequestId })
  if (existingSession) {
    const teacherDoc = await User.findById(existingSession.teacherId)
    const workingHoursDoc = await TeacherWorkingHours.findOne({ teacherId: existingSession.teacherId })
    return { session: existingSession, teacher: teacherDoc?.toPublic() || null, workingHours: workingHoursDoc || null, replayed: true }
  }

  await validateTeacherPayload(teacher)
  validateWorkingHoursPayload(workingHours)
  const existingEmail = await User.findOne({ email: normalizeEmail(teacher.email) })
  if (existingEmail) throw new OnboardingError('البريد الإلكتروني مسجل مسبقاً', 409, 'teacher.email')

  const teacherFields = pickAllowed(teacher, TEACHER_ALLOWED_FIELDS)
  const teacherCredential = resolveCredentialInput(teacher, 'teacher.credential')

  let teacherDoc = null
  let workingHoursDoc = null
  try {
    teacherDoc = await User.create({
      ...teacherFields, email: normalizeEmail(teacher.email), password: teacherCredential.passwordToStore,
      role: 'teacher', mustChangePassword: teacherCredential.mustChangePassword,
      // Hidden from the public directory and blocked from login until this
      // session is finalized (see teacher.controller.js / auth.controller.js).
      onboardingStatus: 'draft', createdBy: actorId,
    })
    workingHoursDoc = await TeacherWorkingHours.create({
      teacherId: teacherDoc._id, timezone: workingHours?.timezone || null,
      days: workingHours?.days || buildDefaultWorkingHours(), updatedBy: actorId,
    })

    const sessionDoc = await OnboardingSession.create({
      clientRequestId: safeClientRequestId, teacherId: teacherDoc._id, createdBy: actorId,
      status: 'teacher_saved', currentStep: 'students',
    })

    logAction({
      actorId, actorRole, action: 'onboardingSession.start', entity: 'OnboardingSession', entityId: sessionDoc._id,
      changes: { teacherId: teacherDoc._id },
    })

    return {
      session: sessionDoc, teacher: teacherDoc.toPublic(), workingHours: workingHoursDoc,
      temporaryPasswords: { teacher: teacherCredential.temporaryPasswordToReturn }, replayed: false,
    }
  } catch (err) {
    await Promise.allSettled([
      workingHoursDoc ? TeacherWorkingHours.deleteOne({ teacherId: teacherDoc._id }) : null,
      teacherDoc ? User.deleteOne({ _id: teacherDoc._id }) : null,
    ].filter(Boolean))
    throw err
  }
}

async function getOnboardingSession({ sessionId }) {
  const session = await OnboardingSession.findById(sessionId)
  if (!session) throw new OnboardingError('جلسة الإعداد غير موجودة', 404)
  const teacher = await User.findById(session.teacherId)
  if (!teacher) throw new OnboardingError('حساب المعلم المرتبط بهذه الجلسة غير موجود', 404)
  const workingHours = await TeacherWorkingHours.findOne({ teacherId: teacher._id })

  const students = []
  for (const studentId of session.studentIds) {
    const summary = await buildStudentSummary(studentId)
    if (summary) students.push(summary)
  }

  return { session, teacher: teacher.toPublic(), workingHours, students }
}

// ── Save one student into an already-started session ───────────────────────
// The single highest-value function in this file: this is the incremental
// persistence step that closes the root-cause bug — the moment this call
// returns, this student's reservation is REAL and DURABLE (or, for a
// new/pending student, held via ScheduleReservationLock +
// pending_teacher_approval), so the very next call to this same function for
// the next student sees it in checkAvailability()/loadBusyByDay() exactly
// like any other booking. Never claims success if the schedule reservation
// or a required relationship (subscription/assignment) failed to persist.
async function saveStudentToSession({ sessionId, clientRequestId, student, actorId, actorRole = 'admin', overrideAllowed = false }) {
  const session = await OnboardingSession.findById(sessionId)
  if (!session) throw new OnboardingError('جلسة الإعداد غير موجودة', 404)
  if (!['teacher_saved', 'adding_students', 'ready_for_review'].includes(session.status)) {
    throw new OnboardingError('لا يمكن إضافة طالب إلى هذه الجلسة في حالتها الحالية', 409)
  }
  const teacher = await User.findOne({ _id: session.teacherId, role: 'teacher' })
  if (!teacher) throw new OnboardingError('حساب المعلم غير موجود', 404)

  // Idempotent per-student save. A schedule-bearing save replays via the
  // AssignmentRequest correlationId (same mechanism as the one-shot wizard);
  // a save with no schedule has no such row, so it replays via the User's
  // own onboardingSaveKey instead.
  const safeClientRequestId = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim() : null
  if (safeClientRequestId) {
    const [existingReq, existingStudent] = await Promise.all([
      AssignmentRequest.findOne({ correlationId: `${safeClientRequestId}:assignment` }),
      User.findOne({ onboardingSaveKey: safeClientRequestId }),
    ])
    const replayId = existingReq?.studentId || existingStudent?._id
    if (replayId) return { ...(await buildStudentSummary(replayId)), replayed: true }
  }

  await validateStudentsPayload([student]) // identical per-student rules as the one-shot wizard
  const normalizedEmail = normalizeEmail(student.email)
  const existingEmail = await User.findOne({ email: normalizedEmail })
  if (existingEmail) throw new OnboardingError('البريد الإلكتروني مسجل مسبقاً', 409, 'email')
  if (student.package?.packageId) await assertPackagesValid([student])

  const studentFields = pickAllowed(student, STUDENT_ALLOWED_FIELDS)
  if (studentFields.gender === '') delete studentFields.gender
  const studentCredential = resolveCredentialInput(student, 'credential')

  let studentDoc = null
  let subscriptionResult = null
  let assignmentRequest = null
  try {
    studentDoc = await User.create({
      ...studentFields, email: normalizedEmail, password: studentCredential.passwordToStore,
      role: 'student', mustChangePassword: studentCredential.mustChangePassword,
      onboardingSaveKey: safeClientRequestId || undefined, createdBy: actorId,
    })

    if (student.package?.packageId) {
      subscriptionResult = await createSubscriptionWithOpeningBalance({
        studentId: studentDoc._id, packageId: student.package.packageId, teacherId: teacher._id,
        startDate: student.package.startDate, notes: student.package.notes,
        lessonsUsed: student.package.lessonsUsed, lessonsRemaining: student.package.lessonsRemaining,
        actorId, actorRole,
      })
    }

    if (student.schedule) {
      const result = await assignmentService.createAssignmentRequest({
        studentId: studentDoc._id, teacherId: teacher._id, studentType: studentDoc.studentType,
        specialization: student.specialization, ageCategory: student.ageCategory, studentAge: student.studentAge,
        lessonDurationMinutes: student.lessonDurationMinutes, schedule: student.schedule,
        teachingType: student.teachingType, adminNotes: student.scheduleNotes, editedMessage: student.editedMessage,
        immediateOverride: !!student.immediateOverride, overrideReason: student.overrideReason, overrideAllowed,
        correlationId: safeClientRequestId ? `${safeClientRequestId}:assignment` : undefined,
        onboardingSessionId: session._id, actorId, actorRole,
      })
      assignmentRequest = result.assignmentRequest
    }
  } catch (err) {
    // Compensating rollback scoped to EXACTLY what this call created. The
    // teacher and every previously-saved sibling student are never touched —
    // this is what makes "Student 2 fails" safe for Student 1.
    if (studentDoc) {
      await Promise.allSettled([
        subscriptionResult ? Subscription.deleteOne({ _id: subscriptionResult.subscription._id }) : null,
        LessonWallet.deleteMany({ studentId: studentDoc._id }),
        LessonTransaction.deleteMany({ studentId: studentDoc._id }),
        User.deleteOne({ _id: studentDoc._id }),
      ].filter(Boolean))
    }
    throw err
  }

  session.studentIds.addToSet(studentDoc._id)
  if (session.status === 'teacher_saved') session.status = 'adding_students'
  await session.save()

  logAction({
    actorId, actorRole, action: 'onboardingSession.save_student', entity: 'User', entityId: studentDoc._id,
    changes: {
      sessionId: session._id, teacherId: teacher._id, studentType: studentDoc.studentType,
      hasSchedule: !!student.schedule, assignmentStatus: assignmentRequest?.status || null,
    },
  })

  const summary = await buildStudentSummary(studentDoc._id)
  return { ...summary, temporaryPassword: studentCredential.temporaryPasswordToReturn, replayed: false }
}

// ── Remove a student from an in-progress session ────────────────────────────
// Releases the reservation first (cancel while pending, or tear down the
// live ScheduleRule/Session if it had already activated), THEN removes the
// student's own records — never the teacher, never a sibling student.
async function removeStudentFromSession({ sessionId, studentId, actorId, actorRole = 'admin', reason }) {
  const session = await OnboardingSession.findById(sessionId)
  if (!session) throw new OnboardingError('جلسة الإعداد غير موجودة', 404)
  if (!session.studentIds.some((id) => String(id) === String(studentId))) {
    throw new OnboardingError('هذا الطالب ليس ضمن هذه الجلسة', 404)
  }

  const activeRequest = await AssignmentRequest.findOne({ studentId, teacherId: session.teacherId }).sort({ createdAt: -1 })
  if (activeRequest && !['cancelled', 'reassigned'].includes(activeRequest.status)) {
    if (['draft', 'pending_teacher_approval', 'rejected', 'time_change_requested'].includes(activeRequest.status)) {
      await assignmentService.cancelAssignment({
        assignmentRequestId: activeRequest._id, actorId, actorRole,
        reason: reason || 'إزالة الطالب أثناء إعداد المعلم',
      })
    } else if (activeRequest.status === 'completed' || activeRequest.status === 'accepted') {
      // Already activated (a real ScheduleRule/Session exists) — tear that
      // down directly, since cancelAssignment's transition set intentionally
      // does not allow cancelling a completed schedule from here.
      await Promise.allSettled([
        Session.deleteMany({ _id: { $in: activeRequest.activationResult?.sessionIds || [] } }),
        ScheduleRule.deleteMany({ _id: { $in: activeRequest.activationResult?.scheduleRuleIds || [] } }),
      ])
      activeRequest.status = 'cancelled'
      activeRequest.cancelReason = reason || 'إزالة الطالب أثناء إعداد المعلم'
      activeRequest.updatedBy = actorId
      activeRequest.responseHistory.push({ action: 'cancelled', actorId, actorRole, note: reason, at: new Date() })
      await activeRequest.save()
    }
  }

  await Promise.allSettled([
    Subscription.deleteMany({ studentId }),
    LessonWallet.deleteMany({ studentId }),
    LessonTransaction.deleteMany({ studentId }),
  ])
  await User.deleteOne({ _id: studentId })

  session.studentIds = session.studentIds.filter((id) => String(id) !== String(studentId))
  await session.save()

  logAction({
    actorId, actorRole, action: 'onboardingSession.remove_student', entity: 'User', entityId: studentId,
    changes: { sessionId: session._id },
  })
  return { session }
}

// ── Finalize (idempotent) ────────────────────────────────────────────────
async function finalizeOnboardingSession({ sessionId, actorId, actorRole = 'admin' }) {
  const session = await OnboardingSession.findById(sessionId)
  if (!session) throw new OnboardingError('جلسة الإعداد غير موجودة', 404)
  if (session.status === 'completed') return { ...(await getOnboardingSession({ sessionId })), replayed: true }
  if (!['teacher_saved', 'adding_students', 'ready_for_review'].includes(session.status)) {
    throw new OnboardingError('لا يمكن إنهاء هذه الجلسة في حالتها الحالية', 409)
  }

  const teacher = await User.findOne({ _id: session.teacherId, role: 'teacher' })
  if (!teacher) throw new OnboardingError('حساب المعلم غير موجود', 404)

  // Reload every student fresh from the backend — never trust local wizard
  // state — and block finalization if any lacks a valid, resolved schedule.
  const blockingIssues = []
  for (const studentId of session.studentIds) {
    const student = await User.findById(studentId)
    if (!student) { blockingIssues.push({ studentId, reason: 'student_missing' }); continue }
    const req = await AssignmentRequest.findOne({ studentId, teacherId: teacher._id }).sort({ createdAt: -1 })
    if (req && ['rejected', 'time_change_requested'].includes(req.status)) {
      blockingIssues.push({ studentId, reason: 'assignment_needs_attention', status: req.status })
    }
  }
  if (blockingIssues.length) {
    const err = new OnboardingError('توجد مشاكل في بعض الطلاب يجب حلها قبل إنهاء العملية', 409, 'students')
    err.blockingIssues = blockingIssues
    throw err
  }

  teacher.onboardingStatus = 'complete'
  await teacher.save()
  session.status = 'completed'
  session.completedAt = new Date()
  await session.save()

  logAction({
    actorId, actorRole, action: 'onboardingSession.finalize', entity: 'OnboardingSession', entityId: session._id,
    changes: { teacherId: teacher._id, studentCount: session.studentIds.length },
  })

  return { ...(await getOnboardingSession({ sessionId })), replayed: false }
}

// ── Cancel the whole session (explicit reason required) ──────────────────
async function cancelOnboardingSession({ sessionId, actorId, actorRole = 'admin', reason }) {
  const session = await OnboardingSession.findById(sessionId)
  if (!session) throw new OnboardingError('جلسة الإعداد غير موجودة', 404)
  if (session.status === 'cancelled') return { session, replayed: true }
  if (session.status === 'completed') throw new OnboardingError('لا يمكن إلغاء عملية تم إنهاؤها بالفعل', 409)
  if (!reason || !reason.trim()) throw new OnboardingError('سبب إلغاء العملية مطلوب', 400, 'reason')

  // Every student saved so far in THIS session is real and will be deleted —
  // never a pre-existing student, since only this session's own students can
  // ever land in `studentIds`.
  for (const studentId of [...session.studentIds]) {
    await removeStudentFromSession({ sessionId: session._id, studentId, actorId, actorRole, reason }).catch(() => {})
  }
  await Promise.allSettled([
    TeacherWorkingHours.deleteOne({ teacherId: session.teacherId }),
    User.deleteOne({ _id: session.teacherId }),
  ])

  const fresh = await OnboardingSession.findById(sessionId)
  fresh.status = 'cancelled'
  fresh.cancelReason = reason
  fresh.cancelledBy = actorId
  fresh.cancelledAt = new Date()
  fresh.studentIds = []
  await fresh.save()

  logAction({ actorId, actorRole, action: 'onboardingSession.cancel', entity: 'OnboardingSession', entityId: fresh._id, changes: { reason } })
  return { session: fresh }
}

// ── Listing (bounded — admin "resume onboarding" view) ──────────────────
async function listOnboardingSessions({ status, page = 1, limit = 20 }) {
  const filter = {}
  if (status) filter.status = Array.isArray(status) ? { $in: status } : status
  const safeLimit = Math.min(Number(limit) || 20, 100)
  const safePage = Math.max(Number(page) || 1, 1)
  const [items, total] = await Promise.all([
    OnboardingSession.find(filter).sort({ updatedAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit)
      .populate('teacherId', 'firstNameAr lastNameAr email onboardingStatus'),
    OnboardingSession.countDocuments(filter),
  ])
  return { items, total, page: safePage, limit: safeLimit }
}

module.exports = {
  startOnboardingSession, getOnboardingSession, saveStudentToSession,
  removeStudentFromSession, finalizeOnboardingSession, cancelOnboardingSession,
  listOnboardingSessions,
}

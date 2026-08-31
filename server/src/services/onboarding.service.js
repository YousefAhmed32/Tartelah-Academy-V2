// "Create a teacher with their students" admin wizard — the Phase 2 Part 1
// operational-foundation flow. Orchestrates User (teacher + N students),
// TeacherWorkingHours, and Subscription/LessonWallet creation as a single
// logical operation.
//
// MongoDB here is a standalone mongod (no replica set — see
// wallet.service.js), so multi-document ACID transactions are not available.
// This uses the same documented pattern already established in this
// codebase: validate everything up front (so most failures never touch the
// database at all), then perform the writes, and if any write step fails
// partway through, run an explicit compensating rollback that deletes
// exactly what THIS call created — never touching any pre-existing data —
// so a failed run never leaves half-created accounts/subscriptions behind
// and never reports success when only part of the operation succeeded.
const User = require('../models/User')
const TeacherWorkingHours = require('../models/TeacherWorkingHours')
const Subscription = require('../models/Subscription')
const LessonWallet = require('../models/LessonWallet')
const LessonTransaction = require('../models/LessonTransaction')
const OnboardingRequest = require('../models/OnboardingRequest')
const AssignmentRequest = require('../models/AssignmentRequest')
const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const Package = require('../models/Package')
const { generateTempPassword } = require('../utils/tempPassword')
const { logAction } = require('../services/audit.service')
const { createSubscriptionWithOpeningBalance } = require('./subscription.service')
const assignmentService = require('./assignment.service')
const { validateTeacherProfileFields } = require('../config/teacherProfile')
const { validateWorkingHoursDays, buildDefaultWorkingHours } = require('../config/workingHours')
const { isValidGender } = require('../config/teacherIdentity')
const { computeOpeningBalance } = require('../config/lessonPolicy')
const { resolveCredentialInput, CredentialError } = require('../config/credentialMode')
// Dynamic catalog-backed check — replaces the old static TEACHING_CATEGORIES
// allow-list. See services/teachingSubject.service.js.
const { isValidActiveKey } = require('./teachingSubject.service')

class OnboardingError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

const TEACHER_ALLOWED_FIELDS = [
  'firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone', 'bioAr',
  'gender', 'specializations', 'audienceCategories', 'hourlyRate', 'availableShifts',
]

const STUDENT_ALLOWED_FIELDS = [
  'firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone', 'bioAr', 'studentType',
  // Optional, never inferred (see config/teacherIdentity.js) — used only for
  // gender-correct wording in the generated assignment message
  // (config/assignmentMessage.js) when a schedule/assignment is set up
  // alongside this student. Left unset ("unresolved") is entirely valid.
  'gender',
]

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function pickAllowed(source, allowed) {
  const out = {}
  allowed.forEach((f) => { if (source[f] !== undefined) out[f] = source[f] })
  return out
}

// ── Pre-flight validation (no DB writes) ─────────────────────────────────────

async function validateTeacherPayload(teacher) {
  if (!teacher || typeof teacher !== 'object') throw new OnboardingError('بيانات المعلم مطلوبة')
  if (!teacher.firstNameAr?.trim() || !teacher.lastNameAr?.trim()) {
    throw new OnboardingError('الاسم الأول واسم العائلة للمعلم مطلوبان', 400, 'teacher')
  }
  if (!teacher.email?.trim()) throw new OnboardingError('البريد الإلكتروني للمعلم مطلوب', 400, 'teacher')
  if (!isValidGender(teacher.gender)) throw new OnboardingError('يجب تحديد تصنيف المعلم: معلم أو معلمة', 400, 'teacher')
  const specializations = Array.isArray(teacher.specializations) ? teacher.specializations : []
  if (!specializations.length) throw new OnboardingError('يجب تحديد تخصص تدريس واحد على الأقل للمعلم', 400, 'teacher')
  if (teacher.hourlyRate === undefined || teacher.hourlyRate === null || teacher.hourlyRate === '') {
    throw new OnboardingError('يجب تحديد سعر ساعة التدريس', 400, 'teacher')
  }
  const profileError = await validateTeacherProfileFields(teacher)
  if (profileError) throw new OnboardingError(profileError, 400, 'teacher')
  // Validates the credential shape now (pure, no DB write) so a weak/
  // mismatched administrator-defined password is rejected before any
  // account is created — the actual password is resolved again at write
  // time (see the write phase below).
  try {
    resolveCredentialInput(teacher, 'teacher.credential')
  } catch (err) {
    if (err instanceof CredentialError) throw new OnboardingError(err.message, err.status, err.field)
    throw err
  }
}

function validateWorkingHoursPayload(workingHours) {
  if (!workingHours) return null
  if (workingHours.days !== undefined) {
    const error = validateWorkingHoursDays(workingHours.days)
    if (error) throw new OnboardingError(error, 400, 'workingHours')
  }
  return workingHours
}

async function validateStudentsPayload(students) {
  if (students === undefined || students === null) return []
  if (!Array.isArray(students)) throw new OnboardingError('قائمة الطلاب غير صالحة')
  for (let idx = 0; idx < students.length; idx++) {
    const student = students[idx]
    if (!student || typeof student !== 'object') throw new OnboardingError(`بيانات الطالب رقم ${idx + 1} غير صالحة`)
    if (!student.firstNameAr?.trim() || !student.lastNameAr?.trim()) {
      throw new OnboardingError(`الاسم الأول واسم العائلة مطلوبان للطالب رقم ${idx + 1}`, 400, `students.${idx}`)
    }
    if (!student.email?.trim()) throw new OnboardingError(`البريد الإلكتروني مطلوب للطالب رقم ${idx + 1}`, 400, `students.${idx}`)
    if (!['existing', 'new'].includes(student.studentType)) {
      throw new OnboardingError(`يجب تحديد نوع الطالب رقم ${idx + 1}: قديم أو جديد`, 400, `students.${idx}`)
    }
    if (student.gender !== undefined && student.gender !== null && student.gender !== '' && !isValidGender(student.gender)) {
      throw new OnboardingError(`تصنيف الطالب رقم ${idx + 1} غير صالح`, 400, `students.${idx}.gender`)
    }
    try {
      resolveCredentialInput(student, `students.${idx}.credential`)
    } catch (err) {
      if (err instanceof CredentialError) throw new OnboardingError(`الطالب رقم ${idx + 1}: ${err.message}`, err.status, `students.${idx}.credential`)
      throw err
    }
    if (student.package) {
      if (!student.package.packageId) throw new OnboardingError(`يجب اختيار باقة للطالب رقم ${idx + 1}`, 400, `students.${idx}.package`)
    }
    if (student.schedule) {
      if (!student.specialization || !(await isValidActiveKey(student.specialization))) {
        throw new OnboardingError(`يجب تحديد تخصص/منهج صالح للطالب رقم ${idx + 1}`, 400, `students.${idx}.specialization`)
      }
      if (!assignmentService.ALLOWED_DURATIONS.includes(Number(student.lessonDurationMinutes))) {
        throw new OnboardingError(`مدة الحصة غير صالحة للطالب رقم ${idx + 1}`, 400, `students.${idx}.lessonDurationMinutes`)
      }
      try {
        assignmentService.validateSchedulePayload(student.schedule)
      } catch (err) {
        throw new OnboardingError(`الطالب رقم ${idx + 1}: ${err.message}`, err.status || 400, `students.${idx}.schedule`)
      }
      if (student.studentType === 'new' && student.immediateOverride && !(student.overrideReason || '').trim()) {
        throw new OnboardingError(`سبب الاعتماد الفوري مطلوب للطالب رقم ${idx + 1}`, 400, `students.${idx}.overrideReason`)
      }
    }
  }
  return students
}

async function assertNoDuplicateEmails(teacherEmail, students) {
  const allEmails = [teacherEmail, ...students.map((s) => s.email)].map(normalizeEmail)
  const seen = new Set()
  for (const email of allEmails) {
    if (seen.has(email)) throw new OnboardingError(`البريد الإلكتروني "${email}" مستخدم أكثر من مرة في نفس الطلب`)
    seen.add(email)
  }
  const existing = await User.find({ email: { $in: allEmails } }, 'email')
  if (existing.length) {
    const list = existing.map((u) => u.email).join('، ')
    throw new OnboardingError(`البريد الإلكتروني التالي مسجل مسبقاً: ${list}`, 409)
  }
}

async function assertPackagesValid(students) {
  const packageIds = [...new Set(students.filter((s) => s.package?.packageId).map((s) => String(s.package.packageId)))]
  if (!packageIds.length) return new Map()
  const packages = await Package.find({ _id: { $in: packageIds } })
  const byId = new Map(packages.map((p) => [String(p._id), p]))
  students.forEach((student, idx) => {
    if (!student.package) return
    const pkg = byId.get(String(student.package.packageId))
    if (!pkg) throw new OnboardingError(`الباقة المحددة للطالب رقم ${idx + 1} غير موجودة`, 404, `students.${idx}.package`)
    if (!pkg.isActive) throw new OnboardingError(`الباقة المحددة للطالب رقم ${idx + 1} غير مُفعّلة`, 400, `students.${idx}.package`)
    // Validate the used/remaining split up front too, so a bad number never
    // reaches the write phase for THIS student while earlier students may
    // have already been written — see the loop in createTeacherWithStudents.
    computeOpeningBalance({
      packageTotal: pkg.sessionsPerMonth,
      lessonsUsed: student.package.lessonsUsed,
      lessonsRemaining: student.package.lessonsRemaining,
    })
  })
  return byId
}

// ── Compensating rollback ────────────────────────────────────────────────────

async function rollback({ teacherId, workingHoursCreated, studentIds, subscriptionIds, assignmentRequestIds, scheduleRuleIds, sessionIds }) {
  await Promise.allSettled([
    sessionIds?.length ? Session.deleteMany({ _id: { $in: sessionIds } }) : null,
    scheduleRuleIds?.length ? ScheduleRule.deleteMany({ _id: { $in: scheduleRuleIds } }) : null,
    assignmentRequestIds?.length ? AssignmentRequest.deleteMany({ _id: { $in: assignmentRequestIds } }) : null,
    subscriptionIds.length ? Subscription.deleteMany({ _id: { $in: subscriptionIds } }) : null,
    studentIds.length ? LessonWallet.deleteMany({ studentId: { $in: studentIds } }) : null,
    studentIds.length ? LessonTransaction.deleteMany({ studentId: { $in: studentIds } }) : null,
    studentIds.length ? User.deleteMany({ _id: { $in: studentIds } }) : null,
    workingHoursCreated && teacherId ? TeacherWorkingHours.deleteOne({ teacherId }) : null,
    teacherId ? User.deleteOne({ _id: teacherId }) : null,
  ].filter(Boolean))
}

// ── Main flow ─────────────────────────────────────────────────────────────

/**
 * Creates a teacher account (with profile/category/specializations/hourly
 * rate/working hours) plus zero or more student accounts (each optionally
 * with a package + documented opening lesson balance), as one logical,
 * all-or-nothing operation. See file header for the transaction/rollback
 * strategy.
 *
 * Returns { teacher, workingHours, students, temporaryPasswords }.
 * Throws OnboardingError (status + Arabic message) on any validation or
 * write failure — never partially succeeds silently.
 */
async function createTeacherWithStudents({ clientRequestId, teacher, workingHours, students, actorId, actorRole = 'admin', overrideAllowed = false }) {
  // clientRequestId must be a plain non-empty string before it ever reaches a
  // Mongo query — req.body is attacker-controlled JSON, so an object like
  // {"$ne": null} would otherwise be embedded as a live query operator,
  // letting any caller of this endpoint replay (and read the resultSummary
  // of) an arbitrary past onboarding request instead of only its own.
  const safeClientRequestId = typeof clientRequestId === 'string' && clientRequestId.trim() ? clientRequestId.trim() : null

  // ── Idempotent replay ──
  if (safeClientRequestId) {
    const existing = await OnboardingRequest.findOne({ clientRequestId: safeClientRequestId })
    if (existing) {
      return { ...existing.resultSummary, replayed: true }
    }
  }

  // ── Validate everything up front — no writes yet ──
  await validateTeacherPayload(teacher)
  validateWorkingHoursPayload(workingHours)
  const studentsPayload = await validateStudentsPayload(students)
  await assertNoDuplicateEmails(teacher.email, studentsPayload)
  const packagesById = await assertPackagesValid(studentsPayload)

  const createdStudentIds = []
  const createdSubscriptionIds = []
  const createdAssignmentRequestIds = []
  const createdScheduleRuleIds = []
  const createdSessionIds = []
  let createdTeacherId = null
  let workingHoursCreated = false

  try {
    // ── Teacher account ──
    const teacherFields = pickAllowed(teacher, TEACHER_ALLOWED_FIELDS)
    const teacherCredential = resolveCredentialInput(teacher, 'teacher.credential')
    const teacherDoc = await User.create({
      ...teacherFields,
      email: normalizeEmail(teacher.email),
      password: teacherCredential.passwordToStore,
      role: 'teacher',
      mustChangePassword: teacherCredential.mustChangePassword,
      createdBy: actorId,
    })
    createdTeacherId = teacherDoc._id

    // ── Working hours (optional — defaults to all-unavailable if omitted,
    // so the profile page always has a row to edit later) ──
    const workingHoursDoc = await TeacherWorkingHours.create({
      teacherId: teacherDoc._id,
      timezone: workingHours?.timezone || null,
      days: workingHours?.days || buildDefaultWorkingHours(),
      updatedBy: actorId,
    })
    workingHoursCreated = true

    logAction({
      actorId, actorRole, action: 'onboarding.create_teacher',
      entity: 'User', entityId: teacherDoc._id,
      changes: { specializations: teacherDoc.specializations, audienceCategories: teacherDoc.audienceCategories, hourlyRate: teacherDoc.hourlyRate },
    })

    // ── Students (each: account + optional package/opening-balance +
    // optional schedule/assignment) ──
    const studentResults = []
    for (const studentInput of studentsPayload) {
      const studentFields = pickAllowed(studentInput, STUDENT_ALLOWED_FIELDS)
      if (studentFields.gender === '') delete studentFields.gender // '' means "unspecified", not a value to store
      const studentCredential = resolveCredentialInput(studentInput, 'students.credential')
      const studentDoc = await User.create({
        ...studentFields,
        email: normalizeEmail(studentInput.email),
        password: studentCredential.passwordToStore,
        role: 'student',
        mustChangePassword: studentCredential.mustChangePassword,
        createdBy: actorId,
      })
      createdStudentIds.push(studentDoc._id)

      logAction({
        actorId, actorRole, action: 'onboarding.create_student',
        entity: 'User', entityId: studentDoc._id,
        changes: { studentType: studentDoc.studentType, teacherId: teacherDoc._id, credentialMode: studentCredential.mode },
      })

      let subscriptionResult = null
      if (studentInput.package?.packageId) {
        subscriptionResult = await createSubscriptionWithOpeningBalance({
          studentId: studentDoc._id,
          packageId: studentInput.package.packageId,
          teacherId: teacherDoc._id,
          startDate: studentInput.package.startDate,
          notes: studentInput.package.notes,
          lessonsUsed: studentInput.package.lessonsUsed,
          lessonsRemaining: studentInput.package.lessonsRemaining,
          actorId, actorRole,
        })
        createdSubscriptionIds.push(subscriptionResult.subscription._id)

        logAction({
          actorId, actorRole, action: 'onboarding.create_subscription',
          entity: 'Subscription', entityId: subscriptionResult.subscription._id,
          changes: {
            studentId: studentDoc._id, teacherId: teacherDoc._id, packageId: studentInput.package.packageId,
            lessonsUsedAtOpening: subscriptionResult.used, lessonsRemainingAtOpening: subscriptionResult.remaining,
          },
        })
      }

      // ── Schedule/assignment (optional — a student can be added now with
      // no schedule and scheduled later from the teacher's profile) ──
      let assignmentResult = null
      if (studentInput.schedule) {
        const { assignmentRequest } = await assignmentService.createAssignmentRequest({
          studentId: studentDoc._id, teacherId: teacherDoc._id, studentType: studentDoc.studentType,
          specialization: studentInput.specialization, ageCategory: studentInput.ageCategory, studentAge: studentInput.studentAge,
          lessonDurationMinutes: studentInput.lessonDurationMinutes, schedule: studentInput.schedule,
          teachingType: studentInput.teachingType, adminNotes: studentInput.scheduleNotes, editedMessage: studentInput.editedMessage,
          immediateOverride: !!studentInput.immediateOverride, overrideReason: studentInput.overrideReason, overrideAllowed,
          actorId, actorRole,
        })
        createdAssignmentRequestIds.push(assignmentRequest._id)
        if (assignmentRequest.activationResult?.scheduleRuleIds?.length) {
          createdScheduleRuleIds.push(...assignmentRequest.activationResult.scheduleRuleIds)
          createdSessionIds.push(...assignmentRequest.activationResult.sessionIds)
        }
        assignmentResult = assignmentRequest
      }

      studentResults.push({
        student: studentDoc.toPublic(),
        temporaryPassword: studentCredential.temporaryPasswordToReturn,
        subscription: subscriptionResult?.subscription || null,
        openingBalance: subscriptionResult ? { used: subscriptionResult.used, remaining: subscriptionResult.remaining } : null,
        assignmentRequest: assignmentResult ? {
          _id: assignmentResult._id, status: assignmentResult.status,
          requiresTeacherApproval: assignmentResult.status === 'pending_teacher_approval',
          immediateAssignment: assignmentResult.status !== 'pending_teacher_approval',
        } : null,
      })
    }

    const summary = {
      teacher: teacherDoc.toPublic(),
      workingHours: workingHoursDoc,
      students: studentResults,
      temporaryPasswords: { teacher: teacherCredential.temporaryPasswordToReturn },
    }

    // Best-effort idempotency record — the wizard's real result already
    // succeeded regardless of whether this write itself succeeds.
    if (safeClientRequestId) {
      await OnboardingRequest.create({
        clientRequestId: safeClientRequestId, actorId, teacherId: teacherDoc._id, studentIds: createdStudentIds, resultSummary: summary,
      }).catch((err) => console.error('[Onboarding] Failed to persist idempotency record:', err.message))
    }

    return summary
  } catch (err) {
    await rollback({
      teacherId: createdTeacherId, workingHoursCreated,
      studentIds: createdStudentIds, subscriptionIds: createdSubscriptionIds,
      assignmentRequestIds: createdAssignmentRequestIds,
      scheduleRuleIds: createdScheduleRuleIds, sessionIds: createdSessionIds,
    })
    logAction({
      actorId, actorRole, action: 'onboarding.create_teacher_with_students_failed',
      entity: 'User', entityId: createdTeacherId || undefined,
      changes: { reason: err.message },
    })
    throw err
  }
}

module.exports = {
  createTeacherWithStudents, OnboardingError, TEACHER_ALLOWED_FIELDS, STUDENT_ALLOWED_FIELDS,
  // Exported for reuse by services/onboardingSession.service.js (the
  // incremental, resumable sibling flow — Phase 2 Part 2c) so per-field
  // validation rules for a teacher/student/schedule/package never diverge
  // between the one-shot and incremental wizards.
  validateTeacherPayload, validateWorkingHoursPayload, validateStudentsPayload,
  assertPackagesValid, normalizeEmail, pickAllowed,
}

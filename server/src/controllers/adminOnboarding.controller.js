// Admin endpoints for Phase 2 Part 1's operational-foundation flows:
// standalone student creation, adding a student to an existing teacher, the
// combined "create a teacher with their students" wizard, and per-teacher
// working-hours management. Business logic lives in
// services/onboarding.service.js / services/subscription.service.js —
// this file is just request validation + response shaping + audit logging.
const User = require('../models/User')
const TeacherWorkingHours = require('../models/TeacherWorkingHours')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createSubscriptionWithOpeningBalance } = require('../services/subscription.service')
const { createTeacherWithStudents } = require('../services/onboarding.service')
const { resolveCredentialInput, CredentialError } = require('../config/credentialMode')
const { userHasPermission } = require('../middleware/rbac.middleware')
const { validateWorkingHoursDays, buildDefaultWorkingHours } = require('../config/workingHours')

const STUDENT_ALLOWED_FIELDS = ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email', 'phone', 'bioAr', 'studentType', 'gender']

function handleKnownError(err, res, next) {
  if (err.status) return sendError(res, err.message, err.status, {
    ...(err.field ? { field: err.field } : {}),
    ...(err.conflicts ? { conflicts: err.conflicts } : {}),
  })
  next(err)
}

// POST /admin/students — standalone student creation (no teacher/subscription
// attached yet). Mirrors admin.controller.createTeacher's shape/conventions.
exports.createStudent = async (req, res, next) => {
  try {
    const { email, firstNameAr, lastNameAr, studentType, credential, password } = req.body
    if (!firstNameAr?.trim() || !lastNameAr?.trim()) return sendError(res, 'الاسم الأول واسم العائلة مطلوبان', 400)
    if (!email?.trim()) return sendError(res, 'البريد الإلكتروني مطلوب', 400)
    if (studentType !== undefined && !['existing', 'new'].includes(studentType)) {
      return sendError(res, 'نوع الطالب يجب أن يكون "قديم" أو "جديد"', 400)
    }
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) return sendError(res, 'البريد الإلكتروني مسجل مسبقاً', 409)

    let resolved
    try {
      resolved = await resolveCredentialInput({ credential, password }, 'credential', 'student')
    } catch (err) {
      if (err instanceof CredentialError || err.status) return handleKnownError(err, res, next)
      throw err
    }

    const fields = {}
    STUDENT_ALLOWED_FIELDS.forEach((f) => { if (req.body[f] !== undefined) fields[f] = req.body[f] })
    if (fields.gender === '') delete fields.gender // '' means "unspecified", not a value to store
    const student = await User.create({
      ...fields, email: normalizedEmail, password: resolved.passwordToStore, role: 'student',
      mustChangePassword: resolved.mustChangePassword, createdBy: req.user._id,
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'admin.create_student',
      entity: 'User', entityId: student._id, changes: { studentType: student.studentType, credentialMode: resolved.mode }, ip: req.ip,
    })

    const responseData = { student: student.toPublic() }
    if (resolved.temporaryPasswordToReturn) responseData.temporaryPassword = resolved.temporaryPasswordToReturn
    sendSuccess(res, responseData, 'تم إنشاء حساب الطالب', 201)
  } catch (err) { next(err) }
}

// POST /admin/teachers/:id/students — "add another student later" from the
// teacher's administrative profile (Part 1 §7). Creates the student account
// and, if a package is given, its subscription + documented opening balance
// — reusing the exact same subscription.service logic the onboarding wizard
// uses, so the two flows can never diverge.
exports.addStudentToTeacher = async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' })
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)

    const {
      email, firstNameAr, lastNameAr, studentType, credential, password, package: pkgInput,
      specialization, ageCategory, studentAge, lessonDurationMinutes, schedule, teachingType,
      scheduleNotes, editedMessage, immediateOverride, overrideReason,
    } = req.body
    if (!firstNameAr?.trim() || !lastNameAr?.trim()) return sendError(res, 'الاسم الأول واسم العائلة مطلوبان', 400)
    if (!email?.trim()) return sendError(res, 'البريد الإلكتروني مطلوب', 400)
    if (!['existing', 'new'].includes(studentType)) return sendError(res, 'يجب تحديد نوع الطالب: قديم أو جديد', 400)

    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) return sendError(res, 'البريد الإلكتروني مسجل مسبقاً', 409)

    let resolved
    try {
      resolved = await resolveCredentialInput({ credential, password }, 'credential', 'student')
    } catch (err) {
      if (err instanceof CredentialError || err.status) return handleKnownError(err, res, next)
      throw err
    }

    const fields = {}
    STUDENT_ALLOWED_FIELDS.forEach((f) => { if (req.body[f] !== undefined) fields[f] = req.body[f] })
    if (fields.gender === '') delete fields.gender // '' means "unspecified", not a value to store
    const student = await User.create({
      ...fields, email: normalizedEmail, password: resolved.passwordToStore, role: 'student',
      mustChangePassword: resolved.mustChangePassword, createdBy: req.user._id,
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'admin.add_student_to_teacher',
      entity: 'User', entityId: student._id, changes: { studentType: student.studentType, teacherId: teacher._id, credentialMode: resolved.mode }, ip: req.ip,
    })

    let subscription = null
    if (pkgInput?.packageId) {
      try {
        const result = await createSubscriptionWithOpeningBalance({
          studentId: student._id, packageId: pkgInput.packageId, teacherId: teacher._id,
          startDate: pkgInput.startDate, notes: pkgInput.notes,
          lessonsUsed: pkgInput.lessonsUsed, lessonsRemaining: pkgInput.lessonsRemaining,
          actorId: req.user._id, actorRole: 'admin',
        })
        subscription = result.subscription
        logAction({
          actorId: req.user._id, actorRole: req.user.role, action: 'admin.create_subscription',
          entity: 'Subscription', entityId: subscription._id,
          changes: { studentId: student._id, teacherId: teacher._id, lessonsUsedAtOpening: result.used, lessonsRemainingAtOpening: result.remaining },
          ip: req.ip,
        })
      } catch (err) {
        // The student account itself was already created successfully — only
        // the subscription step failed. Roll back the student too, since the
        // caller's intent was "add this student to this teacher with this
        // package" as one action; never leave an orphaned account with no
        // subscription and no clear signal why.
        await User.deleteOne({ _id: student._id }).catch(() => {})
        return handleKnownError(err, res, next)
      }
    }

    let assignmentRequest = null
    if (schedule) {
      if (!schedule.meetingLink && teacher.meetingLinks?.[0]?.link) {
        schedule.meetingLink = teacher.meetingLinks[0].link
        schedule.meetingProvider = teacher.meetingLinks[0].provider || 'zoom'
      }
      try {
        const overrideAllowed = userHasPermission(req.user, 'assignments.override')
        const assignmentService = require('../services/assignment.service')
        const result = await assignmentService.createAssignmentRequest({
          studentId: student._id, teacherId: teacher._id, studentType: student.studentType,
          specialization, ageCategory, studentAge, lessonDurationMinutes, schedule, teachingType,
          adminNotes: scheduleNotes, editedMessage, immediateOverride: !!immediateOverride, overrideReason, overrideAllowed,
          actorId: req.user._id, actorRole: req.user.role,
        })
        assignmentRequest = result.assignmentRequest
      } catch (err) {
        // Same all-or-nothing intent as the subscription step above — the
        // whole student account (this endpoint's unit of work) is rolled
        // back, so its wallet/transactions/subscription go with it rather
        // than being reversed piecemeal.
        if (subscription) {
          await Promise.allSettled([
            require('../models/LessonWallet').deleteMany({ studentId: student._id }),
            require('../models/LessonTransaction').deleteMany({ studentId: student._id }),
            require('../models/Subscription').deleteOne({ _id: subscription._id }),
          ])
        }
        await User.deleteOne({ _id: student._id }).catch(() => {})
        return handleKnownError(err, res, next)
      }
    }

    const responseData = {
      student: student.toPublic(), subscription,
      assignmentRequest: assignmentRequest ? {
        _id: assignmentRequest._id, status: assignmentRequest.status,
        requiresTeacherApproval: assignmentRequest.status === 'pending_teacher_approval',
      } : null,
    }
    if (resolved.temporaryPasswordToReturn) responseData.temporaryPassword = resolved.temporaryPasswordToReturn
    sendSuccess(res, responseData, 'تمت إضافة الطالب إلى المعلم', 201)
  } catch (err) { next(err) }
}

// POST /admin/onboarding/teacher-with-students — the full Part 1 wizard.
exports.createTeacherWithStudentsHandler = async (req, res, next) => {
  try {
    const { clientRequestId, teacher, workingHours, students } = req.body
    let result
    try {
      result = await createTeacherWithStudents({
        clientRequestId, teacher, workingHours, students,
        actorId: req.user._id, actorRole: req.user.role,
        overrideAllowed: userHasPermission(req.user, 'assignments.override'),
      })
    } catch (err) {
      return handleKnownError(err, res, next)
    }

    if (!result.replayed) {
      logAction({
        actorId: req.user._id, actorRole: req.user.role, action: 'onboarding.create_teacher_with_students',
        entity: 'User', entityId: result.teacher._id,
        changes: { studentCount: result.students.length },
        ip: req.ip,
      })
    }

    sendSuccess(res, result, result.replayed ? 'تم إنشاء هذا الطلب مسبقًا' : 'تم إنشاء المعلم والطلاب بنجاح', 201)
  } catch (err) { next(err) }
}

// ── Teacher working hours ────────────────────────────────────────────────

exports.getTeacherWorkingHours = async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('_id')
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)
    let doc = await TeacherWorkingHours.findOne({ teacherId: teacher._id })
    if (!doc) doc = await TeacherWorkingHours.create({ teacherId: teacher._id, days: buildDefaultWorkingHours() })
    sendSuccess(res, doc)
  } catch (err) { next(err) }
}

exports.updateTeacherWorkingHours = async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('_id')
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)

    const { days, timezone } = req.body
    const error = validateWorkingHoursDays(days)
    if (error) return sendError(res, error, 400)

    const before = await TeacherWorkingHours.findOne({ teacherId: teacher._id })
    const updated = await TeacherWorkingHours.findOneAndUpdate(
      { teacherId: teacher._id },
      { $set: { days, timezone: timezone || null, updatedBy: req.user._id } },
      { new: true, upsert: true, runValidators: true }
    )

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'teacher.update_working_hours',
      entity: 'TeacherWorkingHours', entityId: updated._id,
      changes: { before: before?.days || null, after: days }, ip: req.ip,
    })

    sendSuccess(res, updated, 'تم تحديث أوقات عمل المعلم')
  } catch (err) { next(err) }
}

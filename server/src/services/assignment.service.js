// Assignment-request workflow (Phase 2 Part 2 §6–§12) — student→teacher
// assignment, teacher accept/reject/propose-alternative-time, and the
// admin follow-up queue (edit & resend / reassign / cancel / immediate
// override). Business logic only; controllers handle request parsing,
// permission checks, and response shaping.
const User = require('../models/User')
const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const AssignmentRequest = require('../models/AssignmentRequest')
const ScheduleReservationLock = require('../models/ScheduleReservationLock')
const { generateSessionsFromRule } = require('./schedule.service')
const { checkAvailability, suggestAlternativeSlots } = require('./availability.service')
const { createNotification, createNotifications } = require('./notification.service')
const { logAction } = require('./audit.service')
const { assertTransition, InvalidTransitionError, ASSIGNMENT_STATUSES } = require('../config/assignmentStatus')
const { buildAssignmentMessage } = require('../config/assignmentMessage')
// Dynamic catalog-backed check + label resolver — replaces the old static
// TEACHING_CATEGORIES allow-list. See services/teachingSubject.service.js.
const { isValidActiveKey, resolveLabel } = require('./teachingSubject.service')
const { isValidTimeString } = require('../config/workingHours')

const ALLOWED_DURATIONS = [30, 45, 60, 90]

class AssignmentError extends Error {
  constructor(message, status = 400, extra) {
    super(message)
    this.status = status
    if (extra) Object.assign(this, extra)
  }
}

function validateSchedulePayload(schedule) {
  if (!schedule || typeof schedule !== 'object') throw new AssignmentError('بيانات الجدول مطلوبة', 400, { field: 'schedule' })
  if (!Array.isArray(schedule.days) || !schedule.days.length) {
    throw new AssignmentError('يجب اختيار يوم واحد على الأقل وموعد بدايته', 400, { field: 'schedule.days' })
  }
  const seen = new Set()
  for (const d of schedule.days) {
    if (!d || !Number.isInteger(d.dayOfWeek) || d.dayOfWeek < 0 || d.dayOfWeek > 6) {
      throw new AssignmentError('رقم اليوم غير صالح', 400, { field: 'schedule.days' })
    }
    if (!isValidTimeString(d.time)) throw new AssignmentError('صيغة وقت الحصة غير صالحة (HH:mm)', 400, { field: 'schedule.days' })
    if (seen.has(d.dayOfWeek)) throw new AssignmentError('لا يمكن اختيار نفس اليوم أكثر من مرة', 400, { field: 'schedule.days' })
    seen.add(d.dayOfWeek)
  }
  if (!schedule.startDate || Number.isNaN(new Date(schedule.startDate).getTime())) {
    throw new AssignmentError('تاريخ بداية الجدول غير صالح', 400, { field: 'schedule.startDate' })
  }
  if (schedule.endDate && Number.isNaN(new Date(schedule.endDate).getTime())) {
    throw new AssignmentError('تاريخ نهاية الجدول غير صالح', 400, { field: 'schedule.endDate' })
  }
  if (schedule.endDate && new Date(schedule.endDate) <= new Date(schedule.startDate)) {
    throw new AssignmentError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية', 400, { field: 'schedule.endDate' })
  }
  if (schedule.frequency && !['daily', 'weekly', 'biweekly', 'monthly'].includes(schedule.frequency)) {
    throw new AssignmentError('تكرار الجدول غير صالح', 400, { field: 'schedule.frequency' })
  }
}

function groupDaysByTime(days) {
  const map = new Map()
  for (const d of days) {
    if (!map.has(d.time)) map.set(d.time, [])
    map.get(d.time).push(d.dayOfWeek)
  }
  return [...map.entries()].map(([time, daysOfWeek]) => ({ time, daysOfWeek }))
}

// ── Concurrency-safety: ScheduleReservationLock acquire/release ────────────
// See models/ScheduleReservationLock.js for the full rationale. This is the
// ONLY code that touches that collection — every reservation-holding path
// (create, accept, edit-and-resend) MUST acquire before persisting a status
// that holds a slot, and every path that stops holding a slot (activation,
// reject, time_change, cancel) MUST release. `checkAvailability()` already
// narrows the field to genuinely-free slots; this closes the remaining
// check-then-write race between two concurrent callers targeting the exact
// same (teacher, dayOfWeek, time).
async function acquireLocks({ teacherId, days, assignmentRequestId, onboardingSessionId, actorId }) {
  const acquiredIds = []
  try {
    for (const day of days) {
      const lock = await ScheduleReservationLock.create({
        teacherId, dayOfWeek: day.dayOfWeek, time: day.time,
        assignmentRequestId, onboardingSessionId: onboardingSessionId || null, createdBy: actorId,
      })
      acquiredIds.push(lock._id)
    }
    return acquiredIds
  } catch (err) {
    // Never leave a partial set of locks behind — release exactly what THIS
    // call acquired before the failure, never a lock some other caller holds.
    if (acquiredIds.length) await ScheduleReservationLock.deleteMany({ _id: { $in: acquiredIds } }).catch(() => {})
    if (err?.code === 11000) {
      throw new AssignmentError('تم حجز هذا الموعد منذ لحظات. اخترنا لك أقرب المواعيد المتاحة.', 409, { lockConflict: true })
    }
    throw err
  }
}

async function releaseLocks(assignmentRequestId) {
  if (!assignmentRequestId) return
  await ScheduleReservationLock.deleteMany({ assignmentRequestId }).catch(() => {})
}

// Attaches real, availability-derived alternative slots to a lock-conflict
// error so the frontend never has to guess a "next" time itself.
async function attachAlternatives(err, { teacherId, days, durationMinutes, timezone }) {
  if (!(err instanceof AssignmentError) || !err.lockConflict) return err
  err.alternativeSlots = await suggestAlternativeSlots({ teacherId, days, durationMinutes, timezone, maxResults: 3 }).catch(() => [])
  return err
}

async function getAdminRecipients() {
  const admins = await User.find({
    isActive: true,
    $or: [{ role: 'admin' }, { permissions: 'assignments.manage' }],
  }).select('_id')
  return admins.map((a) => a._id)
}

async function notifyTeacherNewRequest(doc, teacher, isResend = false) {
  await createNotification({
    userId: teacher._id,
    titleAr: isResend ? 'تم تعديل وإعادة إرسال طلب إسناد طالب' : 'طلب إسناد طالب جديد',
    bodyAr: isResend
      ? 'تم تعديل بيانات طلب إسناد طالب وإعادة إرساله لمراجعتكم'
      : 'وصلكم طلب إسناد طالب جديد بانتظار موافقتكم — يظهر في "طلبات الطلاب"',
    type: 'assignment', priority: 'high',
    actionUrl: `/teacher/assignment-requests/${doc._id}`,
    relatedId: doc._id,
  })
}

async function notifyImmediateAssignment(doc, teacher, { isOverride }) {
  await createNotification({
    userId: teacher._id,
    titleAr: isOverride ? 'تم إسناد طالب جديد إليكم مباشرة' : 'تمت إضافة طالب إلى جدولكم',
    bodyAr: isOverride
      ? 'قامت الإدارة بإسناد طالب جديد إلى جدولكم مباشرة دون الحاجة لموافقتكم'
      : 'تمت إضافة طالب قديم إلى جدولكم وتفعيل حلقته',
    type: 'assignment', priority: 'high',
    actionUrl: `/teacher/assignment-requests/${doc._id}`,
    relatedId: doc._id,
  })
}

async function notifyActivation(doc) {
  const admins = await getAdminRecipients()
  const notifs = [
    { userId: doc.studentId, titleAr: 'تم تفعيل جدولك الدراسي', bodyAr: 'تم تفعيل حلقتك مع المعلم وجدولك الأسبوعي', type: 'assignment', priority: 'high', actionUrl: '/student/schedule', relatedId: doc._id },
    ...admins.map((id) => ({ userId: id, titleAr: 'تم تفعيل جدول طالب', bodyAr: 'تم تفعيل الجدول الدوري بنجاح', type: 'assignment', priority: 'low', actionUrl: `/admin/assignment-requests/${doc._id}`, relatedId: doc._id })),
  ]
  await createNotifications(notifs)
}

async function notifyAdminsOfRejection(doc) {
  const admins = await getAdminRecipients()
  if (!admins.length) return
  await createNotifications(admins.map((id) => ({
    userId: id, titleAr: 'تم رفض طلب إسناد طالب', bodyAr: doc.teacherResponse?.reason || 'رفض المعلم طلب الإسناد',
    type: 'assignment', priority: 'high', actionUrl: `/admin/assignment-requests/${doc._id}`, relatedId: doc._id,
  })))
}

async function notifyAdminsOfTimeChange(doc) {
  const admins = await getAdminRecipients()
  if (!admins.length) return
  await createNotifications(admins.map((id) => ({
    userId: id, titleAr: 'المعلم يطلب تعديل موعد الحصة', bodyAr: 'اقترح المعلم موعدًا بديلًا لطلب إسناد طالب',
    type: 'assignment', priority: 'high', actionUrl: `/admin/assignment-requests/${doc._id}`, relatedId: doc._id,
  })))
}

async function notifyTeacherCancelled(doc) {
  await createNotification({
    userId: doc.teacherId, titleAr: 'تم إلغاء طلب إسناد طالب', bodyAr: 'ألغت الإدارة طلب إسناد كان بانتظار ردكم',
    type: 'assignment', priority: 'medium', relatedId: doc._id,
  })
}

// ── Activation (creates the real ScheduleRule(s) + bounded Session(s)) ─────

/**
 * Idempotent: calling this again on an already-completed request is a no-op
 * that returns the existing result. Only valid from `accepted`.
 */
async function activateAssignment(assignmentRequestOrId, { actorId, actorRole }) {
  const doc = assignmentRequestOrId?._id ? assignmentRequestOrId : await AssignmentRequest.findById(assignmentRequestOrId)
  if (!doc) throw new AssignmentError('طلب الإسناد غير موجود', 404)

  if (doc.status === 'completed' && doc.activationResult?.scheduleRuleIds?.length) return doc
  assertTransition(doc.status, 'completed')

  // Authoritative re-check immediately before writing — state may have
  // changed since this request was created/accepted. MongoDB here is a
  // standalone mongod (no multi-document transactions — same documented
  // limitation as wallet.service.js), so this narrows but does not fully
  // eliminate the race window; the unique {seriesId,scheduledAt} Session
  // index remains the hard backstop against an actual duplicate session.
  const availability = await checkAvailability({
    teacherId: doc.teacherId, studentId: doc.studentId, days: doc.schedule.days,
    durationMinutes: doc.lessonDurationMinutes, timezone: doc.schedule.timezone,
    excludeAssignmentRequestId: doc._id,
  })
  if (!availability.valid) {
    throw new AssignmentError('تعذّر تفعيل الجدول — أصبح الموعد غير متاح', 409, { conflicts: availability.conflicts })
  }

  const groups = groupDaysByTime(doc.schedule.days)
  const createdRuleIds = []
  const createdSessionIds = []
  try {
    for (const group of groups) {
      const rule = await ScheduleRule.create({
        teacherId: doc.teacherId, studentId: doc.studentId,
        frequency: doc.schedule.frequency || 'weekly',
        // 'monthly' means "the same day-of-month as startDate" — schedule.
        // service.js's generateDates() only honors that when daysOfWeek is
        // EMPTY (a non-empty daysOfWeek makes it behave identically to
        // 'weekly', which is not what a monthly rule means). 'daily' ignores
        // daysOfWeek entirely, so passing it through is harmless either way.
        daysOfWeek: doc.schedule.frequency === 'monthly' ? [] : group.daysOfWeek,
        timeOfDay: group.time,
        durationMinutes: doc.lessonDurationMinutes,
        startDate: doc.schedule.startDate, endDate: doc.schedule.endDate || undefined,
        timezone: doc.schedule.timezone || availability.timezone,
        titleTemplate: 'حصة', status: 'active', notes: doc.adminNotes,
      })
      createdRuleIds.push(rule._id)
      const sessions = await generateSessionsFromRule(rule)
      createdSessionIds.push(...sessions.map((s) => s._id))
    }
  } catch (err) {
    await Promise.allSettled([
      createdSessionIds.length ? Session.deleteMany({ _id: { $in: createdSessionIds } }) : null,
      createdRuleIds.length ? ScheduleRule.deleteMany({ _id: { $in: createdRuleIds } }) : null,
    ].filter(Boolean))
    throw err
  }

  doc.status = 'completed'
  doc.activationResult = { scheduleRuleIds: createdRuleIds, sessionIds: createdSessionIds, activatedAt: new Date() }
  doc.updatedBy = actorId
  doc.responseHistory.push({ action: 'activated', actorId, actorRole, at: new Date() })
  await doc.save()

  // The reservation is now durable as a real ScheduleRule — the lock's only
  // job (guarding the write) is done, and `checkAvailability`/`loadBusyByDay`
  // reads the active ScheduleRule directly from here on.
  await releaseLocks(doc._id)

  logAction({
    actorId, actorRole, action: 'assignment.activate', entity: 'AssignmentRequest', entityId: doc._id,
    changes: { teacherId: doc.teacherId, studentId: doc.studentId, scheduleRuleIds: createdRuleIds, sessionCount: createdSessionIds.length },
  })

  await notifyActivation(doc)
  return doc
}

// ── Creation ─────────────────────────────────────────────────────────────

/**
 * Creates an assignment request. `studentType: 'existing'` (or `new` with an
 * authorized `immediateOverride`) activates synchronously in the same call —
 * no separate teacher-approval step. Otherwise the request is left
 * `pending_teacher_approval` and the teacher is notified.
 *
 * Idempotent via `correlationId`: a retried call with the same id returns
 * the already-created request instead of creating a second one.
 */
async function createAssignmentRequest({
  studentId, teacherId, studentType, specialization, ageCategory, studentAge,
  lessonDurationMinutes, schedule, teachingType, adminNotes, editedMessage,
  immediateOverride, overrideReason, overrideAllowed, correlationId, actorId, actorRole,
  onboardingSessionId,
}) {
  const safeCorrelationId = typeof correlationId === 'string' && correlationId.trim() ? correlationId.trim() : null
  if (safeCorrelationId) {
    const existing = await AssignmentRequest.findOne({ correlationId: safeCorrelationId })
    if (existing) return { assignmentRequest: existing, replayed: true }
  }

  const teacher = await User.findOne({ _id: teacherId, role: 'teacher' })
  if (!teacher) throw new AssignmentError('المعلم غير موجود', 404, { field: 'teacherId' })
  const student = await User.findOne({ _id: studentId, role: 'student' })
  if (!student) throw new AssignmentError('الطالب غير موجود', 404, { field: 'studentId' })
  if (!['existing', 'new'].includes(studentType)) throw new AssignmentError('نوع الطالب غير صالح', 400, { field: 'studentType' })
  if (!(await isValidActiveKey(specialization))) throw new AssignmentError('التخصص/المنهج غير صالح', 400, { field: 'specialization' })
  if (!ALLOWED_DURATIONS.includes(Number(lessonDurationMinutes))) throw new AssignmentError('مدة الحصة غير صالحة', 400, { field: 'lessonDurationMinutes' })
  validateSchedulePayload(schedule)

  const wantsImmediate = studentType === 'existing' || immediateOverride === true
  if (studentType === 'new' && immediateOverride === true) {
    if (!overrideAllowed) throw new AssignmentError('لا تملك صلاحية الاعتماد الفوري دون موافقة المعلم', 403)
    if (!overrideReason || !overrideReason.trim()) throw new AssignmentError('سبب الاعتماد الفوري مطلوب', 400, { field: 'overrideReason' })
  }

  const availability = await checkAvailability({
    teacherId, studentId, days: schedule.days, durationMinutes: Number(lessonDurationMinutes), timezone: schedule.timezone,
  })
  if (!availability.valid) throw new AssignmentError('الموعد المحدد غير متاح', 409, { conflicts: availability.conflicts })

  const curriculumLabelOverride = await resolveLabel(specialization)
  const message = buildAssignmentMessage({
    teacherName: `${teacher.firstNameAr} ${teacher.lastNameAr}`,
    studentGender: student.gender,
    studentName: `${student.firstNameAr} ${student.lastNameAr}`,
    studentAge, curriculum: specialization, curriculumLabelOverride,
    scheduleDays: schedule.days, scheduleTimes: schedule.days,
    lessonDurationMinutes: Number(lessonDurationMinutes), teachingType, startDate: schedule.startDate,
  })

  const doc = await AssignmentRequest.create({
    studentId, teacherId, studentType, ageCategory, studentAge,
    specialization, lessonDurationMinutes: Number(lessonDurationMinutes),
    schedule: {
      days: schedule.days, startDate: schedule.startDate, endDate: schedule.endDate || null,
      frequency: schedule.frequency || 'weekly', timezone: schedule.timezone || null,
    },
    teachingType: teachingType || 'individual', adminNotes,
    generatedMessage: message, editedMessage: editedMessage || null,
    status: wantsImmediate ? 'accepted' : 'pending_teacher_approval',
    immediateOverride: (studentType === 'new' && immediateOverride)
      ? { enabled: true, reason: overrideReason, actorId, at: new Date() }
      : undefined,
    correlationId: safeCorrelationId,
    createdBy: actorId, updatedBy: actorId,
    responseHistory: [{
      action: 'created', actorId, actorRole, at: new Date(),
      note: wantsImmediate
        ? (studentType === 'existing' ? 'إسناد مباشر لطالب قديم' : 'اعتماد فوري بواسطة الإدارة دون موافقة المعلم')
        : 'تم إرسال الطلب لمراجعة المعلم',
    }],
  })

  // Acquire the reservation lock for every requested (day, time) before this
  // request is allowed to count as "created" — this is what makes two
  // concurrent callers (two admins, or two tabs of the same onboarding
  // wizard) targeting the exact same slot resolve to exactly one winner.
  try {
    await acquireLocks({ teacherId, days: schedule.days, assignmentRequestId: doc._id, onboardingSessionId, actorId })
  } catch (err) {
    await AssignmentRequest.deleteOne({ _id: doc._id }).catch(() => {})
    throw await attachAlternatives(err, { teacherId, days: schedule.days, durationMinutes: Number(lessonDurationMinutes), timezone: schedule.timezone })
  }

  logAction({
    actorId, actorRole, action: 'assignment.create', entity: 'AssignmentRequest', entityId: doc._id,
    changes: { teacherId, studentId, studentType, immediate: wantsImmediate, override: !!immediateOverride, overrideReason: immediateOverride ? overrideReason : undefined },
  })

  if (wantsImmediate) {
    try {
      await activateAssignment(doc, { actorId, actorRole })
    } catch (err) {
      // Nothing durable should survive a failed immediate activation —
      // release the lock and delete the just-created request rather than
      // leaving a stuck 'accepted' row (or an orphaned lock) with no
      // schedule behind it.
      await releaseLocks(doc._id)
      await AssignmentRequest.deleteOne({ _id: doc._id }).catch(() => {})
      throw err
    }
    await notifyImmediateAssignment(doc, teacher, { isOverride: !!immediateOverride })
  } else {
    await notifyTeacherNewRequest(doc, teacher)
  }

  const fresh = await AssignmentRequest.findById(doc._id)
  return { assignmentRequest: fresh, replayed: false }
}

// ── Teacher response ─────────────────────────────────────────────────────

// Validates a teacher's proposed multi-day alternative schedule — the same
// shape as `schedule.days` but without the startDate/endDate/frequency
// fields a brand-new request needs (a time-change proposal only ever
// replaces WHEN the existing recurring schedule happens, never its date
// range or recurrence pattern). Returns the cleaned, deduped day list.
function validateProposedDays(days) {
  if (!Array.isArray(days) || !days.length) return []
  const seen = new Set()
  const cleaned = []
  for (const d of days) {
    if (!d || !Number.isInteger(d.dayOfWeek) || d.dayOfWeek < 0 || d.dayOfWeek > 6) {
      throw new AssignmentError('رقم اليوم المقترح غير صالح', 400, { field: 'proposedSchedule' })
    }
    if (!isValidTimeString(d.time)) throw new AssignmentError('صيغة الوقت المقترح غير صالحة (HH:mm)', 400, { field: 'proposedSchedule' })
    if (seen.has(d.dayOfWeek)) throw new AssignmentError('لا يمكن اقتراح نفس اليوم أكثر من مرة', 400, { field: 'proposedSchedule' })
    seen.add(d.dayOfWeek)
    cleaned.push({ dayOfWeek: d.dayOfWeek, time: d.time })
  }
  return cleaned
}

async function respondToAssignment({ assignmentRequestId, teacherId, action, reason, proposedTime, proposedSchedule, note, actorRole = 'teacher' }) {
  const doc = await AssignmentRequest.findById(assignmentRequestId)
  if (!doc) throw new AssignmentError('الطلب غير موجود', 404)
  if (String(doc.teacherId) !== String(teacherId)) throw new AssignmentError('لا تملك صلاحية على هذا الطلب', 403)

  // Idempotent re-accept — a duplicate submit after success is a no-op.
  if (action === 'accept' && doc.status === 'completed') return doc
  if (doc.status !== 'pending_teacher_approval') {
    throw new AssignmentError('لم يعد هذا الطلب بانتظار ردكم', 409)
  }

  if (action === 'accept') {
    const availability = await checkAvailability({
      teacherId: doc.teacherId, studentId: doc.studentId, days: doc.schedule.days,
      durationMinutes: doc.lessonDurationMinutes, timezone: doc.schedule.timezone, excludeAssignmentRequestId: doc._id,
    })
    if (!availability.valid) {
      throw new AssignmentError('لم يعد هذا الموعد متاحًا — يرجى اقتراح موعد آخر', 409, { conflicts: availability.conflicts })
    }
    assertTransition(doc.status, 'accepted')
    doc.status = 'accepted'
    doc.teacherResponse = { type: 'accept', note, respondedAt: new Date() }
    doc.responseHistory.push({ action: 'accept', actorId: teacherId, actorRole, note, at: new Date() })
    doc.updatedBy = teacherId
    await doc.save()
    logAction({ actorId: teacherId, actorRole, action: 'assignment.accept', entity: 'AssignmentRequest', entityId: doc._id })
    return activateAssignment(doc, { actorId: teacherId, actorRole })
  }

  if (action === 'reject') {
    if (!reason || !reason.trim()) throw new AssignmentError('سبب الرفض مطلوب', 400, { field: 'reason' })
    assertTransition(doc.status, 'rejected')
    doc.status = 'rejected'
    doc.teacherResponse = { type: 'reject', reason: reason.trim(), note, respondedAt: new Date() }
    doc.responseHistory.push({ action: 'reject', actorId: teacherId, actorRole, note: reason, at: new Date() })
    doc.updatedBy = teacherId
    await doc.save()
    // Rejected — the slot is no longer held on this student's behalf. If an
    // admin later edits & resends (possibly to the same slot), a fresh lock
    // is acquired there.
    await releaseLocks(doc._id)
    logAction({ actorId: teacherId, actorRole, action: 'assignment.reject', entity: 'AssignmentRequest', entityId: doc._id, changes: { reason } })
    await notifyAdminsOfRejection(doc)
    return doc
  }

  if (action === 'time_change') {
    // Accepts a full flexible multi-day replacement schedule
    // (`proposedSchedule.days`) — the teacher can replace one or several
    // days, add/remove weekly sessions, and choose different times for
    // different days, not just substitute one slot. `proposedTime` (a
    // single {dayOfWeek,time}) is still accepted as a legacy single-day
    // shorthand and normalized into the same array.
    const rawDays = Array.isArray(proposedSchedule?.days) && proposedSchedule.days.length
      ? proposedSchedule.days
      : (proposedTime?.dayOfWeek !== undefined && proposedTime?.time ? [proposedTime] : [])
    const cleanedDays = validateProposedDays(rawDays)
    const hasProposedDays = cleanedDays.length > 0
    if (!hasProposedDays && !(note && note.trim())) {
      throw new AssignmentError('يجب اقتراح جدول بديل أو إضافة ملاحظة توضيحية', 400)
    }

    // Authoritative re-check — never trust that a slot the frontend showed
    // as free is still free (the same principle as the accept branch above
    // and activateAssignment()). A stale/now-conflicting proposal comes back
    // as a 409 with fresh, real alternatives instead of silently being
    // accepted and forwarded to the admin queue.
    if (hasProposedDays) {
      const availability = await checkAvailability({
        teacherId: doc.teacherId, studentId: doc.studentId, days: cleanedDays,
        durationMinutes: doc.lessonDurationMinutes, timezone: doc.schedule.timezone, excludeAssignmentRequestId: doc._id,
      })
      if (!availability.valid) {
        const err = new AssignmentError('لم يعد هذا الجدول المقترح متاحًا بالكامل — إليك مواعيد بديلة', 409, {
          conflicts: availability.conflicts, lockConflict: true,
        })
        throw await attachAlternatives(err, {
          teacherId: doc.teacherId, days: cleanedDays,
          durationMinutes: doc.lessonDurationMinutes, timezone: doc.schedule.timezone,
        })
      }
    }
    assertTransition(doc.status, 'time_change_requested')

    // The proposed schedule now becomes what's held (RESERVING_SLOT_SOURCE
    // maps `time_change_requested` → `proposedSchedule`, not the original
    // `schedule.days`) — release the original-slot lock and acquire fresh
    // ones for the proposal so ScheduleReservationLock stays in sync with
    // whichever slot the availability engine now actually treats as busy.
    // Never leave the original lock rows behind (an "orphaned reservation"
    // that would wrongly block an unrelated request from that original slot).
    await releaseLocks(doc._id)
    if (hasProposedDays) {
      try {
        await acquireLocks({ teacherId: doc.teacherId, days: cleanedDays, assignmentRequestId: doc._id, actorId: teacherId })
      } catch (err) {
        throw await attachAlternatives(err, { teacherId: doc.teacherId, days: cleanedDays, durationMinutes: doc.lessonDurationMinutes, timezone: doc.schedule.timezone })
      }
    }

    doc.status = 'time_change_requested'
    doc.teacherResponse = {
      type: 'time_change',
      proposedSchedule: hasProposedDays ? { days: cleanedDays } : undefined,
      proposedTime: hasProposedDays ? cleanedDays[0] : undefined, // legacy single-slot mirror
      note, respondedAt: new Date(),
    }
    doc.responseHistory.push({ action: 'time_change', actorId: teacherId, actorRole, note, at: new Date(), snapshot: { proposedDays: cleanedDays } })
    doc.updatedBy = teacherId
    try {
      await doc.save()
    } catch (err) {
      // Never leave a freshly-acquired lock behind a failed save.
      await releaseLocks(doc._id)
      throw err
    }
    logAction({ actorId: teacherId, actorRole, action: 'assignment.time_change', entity: 'AssignmentRequest', entityId: doc._id, changes: { proposedSchedule: cleanedDays, note } })
    await notifyAdminsOfTimeChange(doc)
    return doc
  }

  throw new AssignmentError('إجراء غير معروف', 400)
}

// ── Admin follow-up: edit & resend / reassign / cancel ──────────────────

async function editAndResend({ assignmentRequestId, updates = {}, actorId, actorRole }) {
  const doc = await AssignmentRequest.findById(assignmentRequestId)
  if (!doc) throw new AssignmentError('الطلب غير موجود', 404)
  if (!['rejected', 'time_change_requested'].includes(doc.status)) {
    throw new AssignmentError('لا يمكن تعديل وإعادة إرسال هذا الطلب في حالته الحالية', 409)
  }
  if (updates.teacherId && String(updates.teacherId) !== String(doc.teacherId)) {
    throw new AssignmentError('لتغيير المعلم استخدم إعادة الإسناد لمعلم آخر', 400)
  }

  if (updates.specialization !== undefined) {
    if (!(await isValidActiveKey(updates.specialization))) throw new AssignmentError('التخصص غير صالح', 400, { field: 'specialization' })
    doc.specialization = updates.specialization
  }
  if (updates.lessonDurationMinutes !== undefined) {
    if (!ALLOWED_DURATIONS.includes(Number(updates.lessonDurationMinutes))) throw new AssignmentError('مدة الحصة غير صالحة', 400)
    doc.lessonDurationMinutes = Number(updates.lessonDurationMinutes)
  }
  if (updates.schedule) {
    validateSchedulePayload(updates.schedule)
    doc.schedule = {
      days: updates.schedule.days,
      startDate: updates.schedule.startDate,
      endDate: updates.schedule.endDate || null,
      frequency: updates.schedule.frequency || doc.schedule.frequency || 'weekly',
      timezone: updates.schedule.timezone ?? doc.schedule.timezone,
    }
  }
  if (updates.adminNotes !== undefined) doc.adminNotes = updates.adminNotes

  const availability = await checkAvailability({
    teacherId: doc.teacherId, studentId: doc.studentId, days: doc.schedule.days,
    durationMinutes: doc.lessonDurationMinutes, timezone: doc.schedule.timezone, excludeAssignmentRequestId: doc._id,
  })
  if (!availability.valid) throw new AssignmentError('الموعد الجديد غير متاح', 409, { conflicts: availability.conflicts })

  if (updates.editedMessage !== undefined) {
    doc.editedMessage = updates.editedMessage
  } else {
    const [teacher, student, curriculumLabelOverride] = await Promise.all([
      User.findById(doc.teacherId), User.findById(doc.studentId), resolveLabel(doc.specialization),
    ])
    doc.generatedMessage = buildAssignmentMessage({
      teacherName: `${teacher.firstNameAr} ${teacher.lastNameAr}`, studentGender: student.gender,
      studentName: `${student.firstNameAr} ${student.lastNameAr}`, studentAge: doc.studentAge,
      curriculum: doc.specialization, curriculumLabelOverride, scheduleDays: doc.schedule.days, scheduleTimes: doc.schedule.days,
      lessonDurationMinutes: doc.lessonDurationMinutes, teachingType: doc.teachingType, startDate: doc.schedule.startDate,
    })
  }

  // The prior reject/time_change already released this request's lock (see
  // respondToAssignment) — re-acquire it for the (possibly unchanged, but
  // possibly retargeted) schedule before this can go back to holding a slot.
  try {
    await acquireLocks({ teacherId: doc.teacherId, days: doc.schedule.days, assignmentRequestId: doc._id, actorId })
  } catch (err) {
    throw await attachAlternatives(err, { teacherId: doc.teacherId, days: doc.schedule.days, durationMinutes: doc.lessonDurationMinutes, timezone: doc.schedule.timezone })
  }

  assertTransition(doc.status, 'pending_teacher_approval')
  doc.status = 'pending_teacher_approval'
  doc.teacherResponse = null
  doc.updatedBy = actorId
  doc.responseHistory.push({ action: 'edited_resent', actorId, actorRole, at: new Date() })
  await doc.save()

  logAction({ actorId, actorRole, action: 'assignment.edit_resend', entity: 'AssignmentRequest', entityId: doc._id, changes: updates })
  const teacher = await User.findById(doc.teacherId)
  await notifyTeacherNewRequest(doc, teacher, true)
  return doc
}

async function reassign({ assignmentRequestId, newTeacherId, scheduleOverrides, actorId, actorRole, reason, immediateOverride, overrideReason, overrideAllowed }) {
  const oldDoc = await AssignmentRequest.findById(assignmentRequestId)
  if (!oldDoc) throw new AssignmentError('الطلب غير موجود', 404)
  if (!['rejected', 'time_change_requested'].includes(oldDoc.status)) {
    throw new AssignmentError('لا يمكن إعادة إسناد هذا الطلب في حالته الحالية', 409)
  }
  if (!reason || !reason.trim()) throw new AssignmentError('سبب إعادة الإسناد مطلوب', 400, { field: 'reason' })

  const newTeacher = await User.findOne({ _id: newTeacherId, role: 'teacher' })
  if (!newTeacher) throw new AssignmentError('المعلم الجديد غير موجود', 404, { field: 'newTeacherId' })

  const schedule = scheduleOverrides || oldDoc.schedule.toObject()
  validateSchedulePayload(schedule)

  const { assignmentRequest: newDoc } = await createAssignmentRequest({
    studentId: oldDoc.studentId, teacherId: newTeacherId, studentType: oldDoc.studentType,
    specialization: oldDoc.specialization, ageCategory: oldDoc.ageCategory, studentAge: oldDoc.studentAge,
    lessonDurationMinutes: oldDoc.lessonDurationMinutes, schedule, teachingType: oldDoc.teachingType,
    adminNotes: oldDoc.adminNotes, immediateOverride, overrideReason, overrideAllowed,
    actorId, actorRole,
  })
  newDoc.previousRequestId = oldDoc._id
  await newDoc.save()

  assertTransition(oldDoc.status, 'reassigned')
  oldDoc.status = 'reassigned'
  oldDoc.replacementRequestId = newDoc._id
  oldDoc.updatedBy = actorId
  oldDoc.responseHistory.push({ action: 'reassigned', actorId, actorRole, note: reason, at: new Date() })
  await oldDoc.save()
  // Superseded by `newDoc` — release whatever hold `oldDoc` still carried
  // (its status here is always 'rejected'/'time_change_requested', both of
  // which should already be lock-free, but this is a deliberate defensive
  // no-op backstop: reassign() must never leave an orphaned reservation
  // behind regardless of how it got here).
  await releaseLocks(oldDoc._id)

  logAction({
    actorId, actorRole, action: 'assignment.reassign', entity: 'AssignmentRequest', entityId: oldDoc._id,
    changes: { newTeacherId, newRequestId: newDoc._id, reason },
  })
  return { oldRequest: oldDoc, newRequest: newDoc }
}

async function cancelAssignment({ assignmentRequestId, actorId, actorRole, reason }) {
  const doc = await AssignmentRequest.findById(assignmentRequestId)
  if (!doc) throw new AssignmentError('الطلب غير موجود', 404)
  if (!['draft', 'pending_teacher_approval', 'rejected', 'time_change_requested'].includes(doc.status)) {
    throw new AssignmentError('لا يمكن إلغاء هذا الطلب في حالته الحالية', 409)
  }
  assertTransition(doc.status, 'cancelled')
  const wasPending = doc.status === 'pending_teacher_approval'
  doc.status = 'cancelled'
  doc.cancelReason = reason
  doc.updatedBy = actorId
  doc.responseHistory.push({ action: 'cancelled', actorId, actorRole, note: reason, at: new Date() })
  await doc.save()
  await releaseLocks(doc._id)

  logAction({ actorId, actorRole, action: 'assignment.cancel', entity: 'AssignmentRequest', entityId: doc._id, changes: { reason } })
  if (wasPending) await notifyTeacherCancelled(doc)
  return doc
}

// ── Listing (bounded, indexed) ───────────────────────────────────────────

async function listForTeacher({ teacherId, status, page = 1, limit = 20 }) {
  const filter = { teacherId }
  if (status) filter.status = Array.isArray(status) ? { $in: status } : status
  const safeLimit = Math.min(Number(limit) || 20, 100)
  const safePage = Math.max(Number(page) || 1, 1)
  const [items, total] = await Promise.all([
    AssignmentRequest.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit)
      .populate('studentId', 'firstNameAr lastNameAr email avatar'),
    AssignmentRequest.countDocuments(filter),
  ])
  return { items, total, page: safePage, limit: safeLimit }
}

async function listForAdmin({ status, teacherId, studentId, page = 1, limit = 20 }) {
  const filter = {}
  if (status) filter.status = Array.isArray(status) ? { $in: status } : status
  if (teacherId) filter.teacherId = teacherId
  if (studentId) filter.studentId = studentId
  const safeLimit = Math.min(Number(limit) || 20, 100)
  const safePage = Math.max(Number(page) || 1, 1)
  const [items, total] = await Promise.all([
    AssignmentRequest.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit)
      .populate('studentId', 'firstNameAr lastNameAr email avatar')
      .populate('teacherId', 'firstNameAr lastNameAr email avatar'),
    AssignmentRequest.countDocuments(filter),
  ])
  return { items, total, page: safePage, limit: safeLimit }
}

// ── Admin tab counts (bounded aggregate, one query, indexed on `status`) ───
// Powers the admin monitoring page's per-tab count badges — a single grouped
// count instead of one bounded `countDocuments` per tab, so newly created
// pending requests are reflected immediately without N extra round-trips.
async function getStatusCounts() {
  const rows = await AssignmentRequest.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  const counts = Object.fromEntries(ASSIGNMENT_STATUSES.map((s) => [s, 0]))
  for (const row of rows) {
    if (row._id in counts) counts[row._id] = row.count
  }
  return counts
}

module.exports = {
  AssignmentError, InvalidTransitionError, ALLOWED_DURATIONS,
  createAssignmentRequest, activateAssignment, respondToAssignment,
  editAndResend, reassign, cancelAssignment,
  listForTeacher, listForAdmin, getStatusCounts,
  validateSchedulePayload, groupDaysByTime,
}

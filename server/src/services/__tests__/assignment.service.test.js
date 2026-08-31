// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) for the
// assignment-request state machine: creation (direct vs pending vs
// override), teacher accept/reject/time-change, edit & resend, reassignment,
// and cancellation.
jest.mock('../../models/User')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/Session')
jest.mock('../../models/AssignmentRequest')
jest.mock('../../models/ScheduleReservationLock')
jest.mock('../schedule.service')
jest.mock('../availability.service')
jest.mock('../notification.service')
jest.mock('../audit.service')
jest.mock('../teachingSubject.service')

const User = require('../../models/User')
const ScheduleRule = require('../../models/ScheduleRule')
const Session = require('../../models/Session')
const AssignmentRequest = require('../../models/AssignmentRequest')
const ScheduleReservationLock = require('../../models/ScheduleReservationLock')
const { generateSessionsFromRule } = require('../schedule.service')
const { checkAvailability, suggestAlternativeSlots } = require('../availability.service')
const { createNotification, createNotifications } = require('../notification.service')
const { isValidActiveKey, resolveLabel } = require('../teachingSubject.service')
const assignmentService = require('../assignment.service')

// Same six canonical keys the old static TEACHING_CATEGORIES allow-list
// covered — replicates its exact behavior so every existing test keeps
// working unchanged against the new catalog-backed (mocked here) check.
const LEGACY_CATEGORIES = ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other']

const teacher = { _id: 't1', role: 'teacher', firstNameAr: 'أحمد', lastNameAr: 'علي', gender: 'male' }
const student = { _id: 's1', role: 'student', firstNameAr: 'سارة', lastNameAr: 'محمد', gender: 'female' }

const validSchedule = { days: [{ dayOfWeek: 0, time: '10:00' }], startDate: '2026-09-01', frequency: 'weekly' }

// A minimal, mutable stand-in for a Mongoose AssignmentRequest document —
// supports the handful of methods/fields the service actually touches
// (save, responseHistory.push, schedule.toObject) without pulling in a real
// ODM. Every AssignmentRequest.create()/findById() call in a given test
// returns THIS SAME object so in-place mutations (status, activationResult)
// made by one service call are visible to the next.
function makeDoc(overrides = {}) {
  const doc = {
    _id: overrides._id || 'req1',
    studentId: overrides.studentId || 's1',
    teacherId: overrides.teacherId || 't1',
    studentType: overrides.studentType || 'new',
    specialization: overrides.specialization || 'tajweed',
    lessonDurationMinutes: overrides.lessonDurationMinutes || 60,
    schedule: { ...validSchedule, toObject() { return { ...this } } },
    status: overrides.status || 'pending_teacher_approval',
    teacherResponse: null,
    responseHistory: [],
    activationResult: {},
    adminNotes: overrides.adminNotes,
    teachingType: 'individual',
    save: jest.fn().mockImplementation(function save() { return Promise.resolve(doc) }),
    ...overrides,
  }
  return doc
}

beforeEach(() => {
  jest.resetAllMocks()
  User.findOne.mockImplementation(({ _id, role }) => Promise.resolve(role === 'teacher' ? { ...teacher, _id } : { ...student, _id }))
  User.findById.mockImplementation((id) => Promise.resolve(id === 't1' || id === 't2' ? { ...teacher, _id: id } : { ...student, _id: id }))
  User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
  checkAvailability.mockResolvedValue({ valid: true, conflicts: [], timezone: 'Africa/Cairo' })
  ScheduleRule.create.mockResolvedValue({ _id: 'rule1' })
  ScheduleRule.deleteMany.mockResolvedValue({})
  Session.deleteMany.mockResolvedValue({})
  generateSessionsFromRule.mockResolvedValue([{ _id: 'sess1' }, { _id: 'sess2' }])
  createNotification.mockResolvedValue({})
  createNotifications.mockResolvedValue([])
  AssignmentRequest.findOne.mockResolvedValue(null) // no correlationId collision by default
  AssignmentRequest.deleteOne = jest.fn().mockResolvedValue({})
  ScheduleReservationLock.create.mockResolvedValue({ _id: 'lock1' })
  ScheduleReservationLock.deleteMany.mockResolvedValue({})
  suggestAlternativeSlots.mockResolvedValue([{ dayOfWeek: 0, time: '13:00' }])
  isValidActiveKey.mockImplementation((key) => Promise.resolve(LEGACY_CATEGORIES.includes(key)))
  resolveLabel.mockResolvedValue('التجويد')
})

describe('createAssignmentRequest', () => {
  test('an existing student is activated immediately (no teacher approval step)', async () => {
    const doc = makeDoc({ studentType: 'existing', status: 'accepted' })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.findById.mockResolvedValue(doc)

    const { assignmentRequest } = await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, actorId: 'admin1', actorRole: 'admin',
    })

    expect(AssignmentRequest.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }))
    expect(ScheduleRule.create).toHaveBeenCalled()
    expect(generateSessionsFromRule).toHaveBeenCalled()
    expect(assignmentRequest.status).toBe('completed')
  })

  test('a new student without override is left pending and the teacher is notified', async () => {
    const doc = makeDoc({ studentType: 'new', status: 'pending_teacher_approval' })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.findById.mockResolvedValue(doc)

    await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'new', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, actorId: 'admin1', actorRole: 'admin',
    })

    expect(ScheduleRule.create).not.toHaveBeenCalled()
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 't1', type: 'assignment' }))
  })

  test('a new student with immediateOverride but no override permission is rejected', async () => {
    await expect(assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'new', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, immediateOverride: true, overrideReason: 'urgent',
      overrideAllowed: false, actorId: 'admin1', actorRole: 'admin',
    })).rejects.toMatchObject({ status: 403 })
    expect(AssignmentRequest.create).not.toHaveBeenCalled()
  })

  test('a new student with an authorized override requires a reason', async () => {
    await expect(assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'new', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, immediateOverride: true, overrideReason: '   ',
      overrideAllowed: true, actorId: 'admin1', actorRole: 'admin',
    })).rejects.toMatchObject({ status: 400 })
  })

  test('a new student with an authorized override + reason activates immediately', async () => {
    const doc = makeDoc({ studentType: 'new', status: 'accepted' })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.findById.mockResolvedValue(doc)

    const { assignmentRequest } = await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'new', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, immediateOverride: true, overrideReason: 'حالة عاجلة',
      overrideAllowed: true, actorId: 'admin1', actorRole: 'admin',
    })
    expect(assignmentRequest.status).toBe('completed')
  })

  test('an unavailable slot is rejected before any write', async () => {
    checkAvailability.mockResolvedValue({ valid: false, conflicts: [{ reason: 'teacher_conflict' }] })
    await expect(assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, actorId: 'admin1', actorRole: 'admin',
    })).rejects.toMatchObject({ status: 409 })
    expect(AssignmentRequest.create).not.toHaveBeenCalled()
  })

  test('a repeated call with the same correlationId replays instead of duplicating', async () => {
    const existing = makeDoc({ status: 'completed' })
    AssignmentRequest.findOne.mockResolvedValue(existing)
    const { assignmentRequest, replayed } = await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, correlationId: 'corr-1', actorId: 'admin1', actorRole: 'admin',
    })
    expect(replayed).toBe(true)
    expect(assignmentRequest).toBe(existing)
    expect(AssignmentRequest.create).not.toHaveBeenCalled()
  })

  test('activation failure deletes the just-created request instead of leaving it stuck', async () => {
    const doc = makeDoc({ studentType: 'existing', status: 'accepted' })
    AssignmentRequest.create.mockResolvedValue(doc)
    ScheduleRule.create.mockRejectedValue(new Error('db down'))
    AssignmentRequest.deleteOne = jest.fn().mockResolvedValue({})

    await expect(assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, actorId: 'admin1', actorRole: 'admin',
    })).rejects.toThrow('db down')
    expect(AssignmentRequest.deleteOne).toHaveBeenCalledWith({ _id: doc._id })
  })

  // Phase 2 Part 2 UX redesign — 'daily' and 'monthly' recurrence support.
  test('monthly frequency creates a ScheduleRule with an EMPTY daysOfWeek (day-of-month behavior, not "every weekday")', async () => {
    const monthlySchedule = { days: [{ dayOfWeek: 2, time: '10:00' }], startDate: '2026-09-15', frequency: 'monthly', toObject() { return { ...this } } }
    const doc = makeDoc({ studentType: 'existing', status: 'accepted', schedule: monthlySchedule })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.findById.mockResolvedValue(doc)

    await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: monthlySchedule, actorId: 'admin1', actorRole: 'admin',
    })

    // A non-empty daysOfWeek here would make schedule.service.js's
    // generateDates() treat 'monthly' identically to 'weekly' — this test
    // guards against that regression.
    expect(ScheduleRule.create).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'monthly', daysOfWeek: [] }))
  })

  test('daily frequency is accepted, activates, and keeps its daysOfWeek (harmless — generateDates ignores it for daily)', async () => {
    const dailySchedule = {
      days: [0, 1, 2, 3, 4, 5, 6].map((dow) => ({ dayOfWeek: dow, time: '10:00' })),
      startDate: '2026-09-01', frequency: 'daily', toObject() { return { ...this } },
    }
    const doc = makeDoc({ studentType: 'existing', status: 'accepted', schedule: dailySchedule })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.findById.mockResolvedValue(doc)

    const { assignmentRequest } = await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 30, schedule: dailySchedule, actorId: 'admin1', actorRole: 'admin',
    })

    expect(assignmentRequest.status).toBe('completed')
    expect(ScheduleRule.create).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'daily' }))
  })

  test('an unsupported recurrence value is rejected before any write', async () => {
    await expect(assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: { ...validSchedule, frequency: 'yearly' }, actorId: 'admin1', actorRole: 'admin',
    })).rejects.toMatchObject({ status: 400 })
    expect(AssignmentRequest.create).not.toHaveBeenCalled()
  })
})

describe('validateSchedulePayload — supported recurrence values', () => {
  test('accepts every recurrence the backend scheduling engine actually executes', () => {
    for (const frequency of ['daily', 'weekly', 'biweekly', 'monthly']) {
      expect(() => assignmentService.validateSchedulePayload({
        days: [{ dayOfWeek: 0, time: '10:00' }], startDate: '2026-09-01', frequency,
      })).not.toThrow()
    }
  })
  test('rejects a recurrence value with no matching backend support', () => {
    expect(() => assignmentService.validateSchedulePayload({
      days: [{ dayOfWeek: 0, time: '10:00' }], startDate: '2026-09-01', frequency: 'yearly',
    })).toThrow(assignmentService.AssignmentError)
  })
})

describe('respondToAssignment', () => {
  test('accept revalidates availability and activates the schedule', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    const result = await assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'accept' })
    expect(result.status).toBe('completed')
    expect(ScheduleRule.create).toHaveBeenCalled()
  })

  test('accept is rejected when the slot is no longer available', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    checkAvailability.mockResolvedValue({ valid: false, conflicts: [{ reason: 'teacher_conflict' }] })
    await expect(assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'accept' }))
      .rejects.toMatchObject({ status: 409 })
    expect(doc.status).toBe('pending_teacher_approval') // unchanged
  })

  test('a repeated accept on an already-completed request is idempotent', async () => {
    const doc = makeDoc({ status: 'completed' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    const result = await assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'accept' })
    expect(result).toBe(doc)
    expect(ScheduleRule.create).not.toHaveBeenCalled()
  })

  test('reject requires a reason', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'reject' }))
      .rejects.toMatchObject({ status: 400 })
  })

  test('reject with a reason transitions to rejected and notifies admins', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'admin1' }]) })
    const result = await assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'reject', reason: 'موعد غير مناسب' })
    expect(result.status).toBe('rejected')
    expect(createNotifications).toHaveBeenCalled()
  })

  test('time_change requires either a proposed time or a note', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change' }))
      .rejects.toMatchObject({ status: 400 })
  })

  // Redesigned "propose alternative time" picker — the backend must
  // authoritatively revalidate the proposed slot, never trust that a slot
  // the frontend displayed as free is still free at submit time.
  test('a valid proposed time revalidates availability and transitions to time_change_requested', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    const result = await assignmentService.respondToAssignment({
      assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change',
      proposedTime: { dayOfWeek: 2, time: '18:00' },
    })
    expect(checkAvailability).toHaveBeenCalledWith(expect.objectContaining({
      days: [{ dayOfWeek: 2, time: '18:00' }], excludeAssignmentRequestId: doc._id,
    }))
    expect(result.status).toBe('time_change_requested')
  })

  test('a proposed time that is no longer available is rejected with 409, conflicts, and fresh alternatives — the request stays pending', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    checkAvailability.mockResolvedValue({ valid: false, conflicts: [{ dayOfWeek: 2, time: '18:00', reason: 'teacher_conflict' }] })

    const err = await assignmentService.respondToAssignment({
      assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change',
      proposedTime: { dayOfWeek: 2, time: '18:00' },
    }).catch((e) => e)

    expect(err.status).toBe(409)
    expect(err.conflicts).toEqual([{ dayOfWeek: 2, time: '18:00', reason: 'teacher_conflict' }])
    expect(err.alternativeSlots).toEqual([{ dayOfWeek: 0, time: '13:00' }])
    expect(doc.status).toBe('pending_teacher_approval') // unchanged
    expect(doc.save).not.toHaveBeenCalled()
  })

  test('an invalid proposed dayOfWeek is rejected before any availability check', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.respondToAssignment({
      assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change',
      proposedTime: { dayOfWeek: 9, time: '18:00' },
    })).rejects.toMatchObject({ status: 400 })
    expect(checkAvailability).not.toHaveBeenCalled()
  })

  // Flexible multi-day alternative schedule (Phase 2 change request #2) —
  // the teacher can propose a completely different multi-day schedule, not
  // just one substitute slot.
  test('a multi-day proposed schedule revalidates every day and acquires a lock for each', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    const proposedSchedule = { days: [{ dayOfWeek: 1, time: '17:00' }, { dayOfWeek: 3, time: '18:30' }] }

    const result = await assignmentService.respondToAssignment({
      assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change', proposedSchedule,
    })

    expect(checkAvailability).toHaveBeenCalledWith(expect.objectContaining({ days: proposedSchedule.days }))
    expect(ScheduleReservationLock.deleteMany).toHaveBeenCalledWith({ assignmentRequestId: doc._id })
    expect(ScheduleReservationLock.create).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 't1', dayOfWeek: 1, time: '17:00', assignmentRequestId: doc._id }))
    expect(ScheduleReservationLock.create).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 't1', dayOfWeek: 3, time: '18:30', assignmentRequestId: doc._id }))
    expect(result.status).toBe('time_change_requested')
    expect(result.teacherResponse.proposedSchedule.days).toEqual(proposedSchedule.days)
    expect(result.teacherResponse.proposedTime).toEqual(proposedSchedule.days[0]) // legacy mirror
  })

  test('proposing the same day twice is rejected before any availability check', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.respondToAssignment({
      assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change',
      proposedSchedule: { days: [{ dayOfWeek: 1, time: '17:00' }, { dayOfWeek: 1, time: '18:00' }] },
    })).rejects.toMatchObject({ status: 400 })
    expect(checkAvailability).not.toHaveBeenCalled()
  })

  test('a multi-day proposal with one now-conflicting day is rejected with 409 and fresh alternatives — no lock is acquired', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    checkAvailability.mockResolvedValue({ valid: false, conflicts: [{ dayOfWeek: 3, time: '18:30', reason: 'teacher_conflict', kind: 'confirmed' }] })

    const err = await assignmentService.respondToAssignment({
      assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change',
      proposedSchedule: { days: [{ dayOfWeek: 1, time: '17:00' }, { dayOfWeek: 3, time: '18:30' }] },
    }).catch((e) => e)

    expect(err.status).toBe(409)
    expect(err.alternativeSlots).toEqual([{ dayOfWeek: 0, time: '13:00' }])
    expect(doc.status).toBe('pending_teacher_approval') // unchanged
    expect(ScheduleReservationLock.create).not.toHaveBeenCalled()
  })

  test('a teacher cannot respond to another teacher\'s request', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval', teacherId: 't1' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't2', action: 'accept' }))
      .rejects.toMatchObject({ status: 403 })
  })

  test('cannot respond to a request that is no longer pending', async () => {
    const doc = makeDoc({ status: 'rejected' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'accept' }))
      .rejects.toMatchObject({ status: 409 })
  })
})

describe('editAndResend', () => {
  test('cannot edit&resend a request that is still pending', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.editAndResend({ assignmentRequestId: 'req1', updates: {}, actorId: 'admin1', actorRole: 'admin' }))
      .rejects.toMatchObject({ status: 409 })
  })

  test('a rejected request can be edited and resent, moving back to pending', async () => {
    const doc = makeDoc({ status: 'rejected' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    const result = await assignmentService.editAndResend({
      assignmentRequestId: 'req1', updates: { adminNotes: 'موعد جديد' }, actorId: 'admin1', actorRole: 'admin',
    })
    expect(result.status).toBe('pending_teacher_approval')
    expect(createNotification).toHaveBeenCalled()
  })

  test('cannot change teacherId via edit&resend (must use reassign)', async () => {
    const doc = makeDoc({ status: 'rejected', teacherId: 't1' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.editAndResend({ assignmentRequestId: 'req1', updates: { teacherId: 't2' }, actorId: 'admin1', actorRole: 'admin' }))
      .rejects.toMatchObject({ status: 400 })
  })
})

describe('reassign', () => {
  test('rejects reassigning a request that is not rejected/time_change_requested', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.reassign({ assignmentRequestId: 'req1', newTeacherId: 't2', reason: 'x', actorId: 'admin1', actorRole: 'admin' }))
      .rejects.toMatchObject({ status: 409 })
  })

  test('requires a reason', async () => {
    const doc = makeDoc({ status: 'rejected' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.reassign({ assignmentRequestId: 'req1', newTeacherId: 't2', actorId: 'admin1', actorRole: 'admin' }))
      .rejects.toMatchObject({ status: 400 })
  })

  test('creates a linked replacement request and marks the old one reassigned', async () => {
    const oldDoc = makeDoc({ status: 'rejected', _id: 'req1' })
    const newDoc = makeDoc({ status: 'pending_teacher_approval', _id: 'req2', teacherId: 't2' })
    AssignmentRequest.findById.mockImplementation((id) => Promise.resolve(id === 'req1' ? oldDoc : newDoc))
    AssignmentRequest.create.mockResolvedValue(newDoc)

    const { oldRequest, newRequest } = await assignmentService.reassign({
      assignmentRequestId: 'req1', newTeacherId: 't2', reason: 'المعلم الأول رفض', actorId: 'admin1', actorRole: 'admin',
    })

    expect(oldRequest.status).toBe('reassigned')
    expect(oldRequest.replacementRequestId).toBe(newDoc._id)
    expect(newRequest.previousRequestId).toBe(oldDoc._id)
  })
})

describe('cancelAssignment', () => {
  test('cannot cancel a completed assignment', async () => {
    const doc = makeDoc({ status: 'completed' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await expect(assignmentService.cancelAssignment({ assignmentRequestId: 'req1', reason: 'x', actorId: 'admin1', actorRole: 'admin' }))
      .rejects.toMatchObject({ status: 409 })
  })

  test('cancels a pending request and notifies the teacher', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    const result = await assignmentService.cancelAssignment({ assignmentRequestId: 'req1', reason: 'الطالب اعتذر', actorId: 'admin1', actorRole: 'admin' })
    expect(result.status).toBe('cancelled')
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: doc.teacherId }))
    expect(ScheduleReservationLock.deleteMany).toHaveBeenCalledWith({ assignmentRequestId: doc._id })
  })
})

describe('getStatusCounts', () => {
  test('returns every known status with a zero default, overlaid by real aggregate counts', async () => {
    AssignmentRequest.aggregate = jest.fn().mockResolvedValue([
      { _id: 'pending_teacher_approval', count: 3 },
      { _id: 'completed', count: 5 },
    ])
    const counts = await assignmentService.getStatusCounts()
    expect(counts.pending_teacher_approval).toBe(3)
    expect(counts.completed).toBe(5)
    expect(counts.rejected).toBe(0) // present with a zero default, not missing
  })
})

// Phase 2 Part 2c — ScheduleReservationLock concurrency-safety integration.
describe('ScheduleReservationLock integration', () => {
  test('createAssignmentRequest acquires a lock for every requested day before counting as created', async () => {
    const doc = makeDoc({ studentType: 'new', status: 'pending_teacher_approval' })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.findById.mockResolvedValue(doc)
    const twoDaySchedule = { days: [{ dayOfWeek: 0, time: '10:00' }, { dayOfWeek: 2, time: '11:00' }], startDate: '2026-09-01', frequency: 'weekly' }

    await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'new', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: twoDaySchedule, actorId: 'admin1', actorRole: 'admin',
    })

    expect(ScheduleReservationLock.create).toHaveBeenCalledTimes(2)
    expect(ScheduleReservationLock.create).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 't1', dayOfWeek: 0, time: '10:00', assignmentRequestId: doc._id }))
    expect(ScheduleReservationLock.create).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 't1', dayOfWeek: 2, time: '11:00', assignmentRequestId: doc._id }))
  })

  test('a concurrent duplicate-key lock conflict is surfaced as 409 with real alternative slots, and the request is not left behind', async () => {
    const doc = makeDoc({ studentType: 'existing', status: 'accepted' })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.deleteOne = jest.fn().mockResolvedValue({})
    const dupError = new Error('E11000 duplicate key')
    dupError.code = 11000
    ScheduleReservationLock.create.mockRejectedValue(dupError)

    const err = await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, actorId: 'admin1', actorRole: 'admin',
    }).catch((e) => e)

    expect(err.status).toBe(409)
    expect(err.lockConflict).toBe(true)
    expect(err.alternativeSlots).toEqual([{ dayOfWeek: 0, time: '13:00' }])
    expect(AssignmentRequest.deleteOne).toHaveBeenCalledWith({ _id: doc._id })
  })

  test('successful activation releases the lock — the ScheduleRule is now the durable reservation', async () => {
    const doc = makeDoc({ studentType: 'existing', status: 'accepted' })
    AssignmentRequest.create.mockResolvedValue(doc)
    AssignmentRequest.findById.mockResolvedValue(doc)

    await assignmentService.createAssignmentRequest({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed',
      lessonDurationMinutes: 60, schedule: validSchedule, actorId: 'admin1', actorRole: 'admin',
    })

    expect(ScheduleReservationLock.deleteMany).toHaveBeenCalledWith({ assignmentRequestId: doc._id })
  })

  test('rejecting a pending request releases its lock', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'reject', reason: 'موعد غير مناسب' })
    expect(ScheduleReservationLock.deleteMany).toHaveBeenCalledWith({ assignmentRequestId: doc._id })
  })

  test('a proposed time_change releases the original lock', async () => {
    const doc = makeDoc({ status: 'pending_teacher_approval' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await assignmentService.respondToAssignment({ assignmentRequestId: 'req1', teacherId: 't1', action: 'time_change', note: 'وقت آخر أفضل' })
    expect(ScheduleReservationLock.deleteMany).toHaveBeenCalledWith({ assignmentRequestId: doc._id })
  })

  test('editAndResend re-acquires a lock before going back to pending', async () => {
    const doc = makeDoc({ status: 'rejected' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    await assignmentService.editAndResend({ assignmentRequestId: 'req1', updates: { adminNotes: 'موعد جديد' }, actorId: 'admin1', actorRole: 'admin' })
    expect(ScheduleReservationLock.create).toHaveBeenCalledWith(expect.objectContaining({ teacherId: doc.teacherId, assignmentRequestId: doc._id }))
  })

  test('editAndResend surfaces a lock conflict as 409 with alternatives instead of silently keeping the old status', async () => {
    const doc = makeDoc({ status: 'rejected' })
    AssignmentRequest.findById.mockResolvedValue(doc)
    const dupError = new Error('E11000 duplicate key')
    dupError.code = 11000
    ScheduleReservationLock.create.mockRejectedValue(dupError)

    const err = await assignmentService.editAndResend({ assignmentRequestId: 'req1', updates: {}, actorId: 'admin1', actorRole: 'admin' }).catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.lockConflict).toBe(true)
    expect(err.alternativeSlots).toEqual([{ dayOfWeek: 0, time: '13:00' }])
    expect(doc.status).toBe('rejected') // unchanged — never left in a half-transitioned state
  })
})

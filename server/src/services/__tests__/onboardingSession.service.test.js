// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) for the incremental,
// resumable onboarding flow (Phase 2 Part 2c): the teacher is persisted
// before any student, each student is saved one at a time with its own
// idempotency key, a failed student never touches the teacher or an earlier
// sibling, and finalize/cancel reload from the backend rather than trusting
// local state.
jest.mock('../../models/User')
jest.mock('../../models/TeacherWorkingHours')
jest.mock('../../models/OnboardingSession')
jest.mock('../../models/AssignmentRequest')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/Session')
jest.mock('../../models/Subscription')
jest.mock('../../models/LessonWallet')
jest.mock('../../models/LessonTransaction')
jest.mock('../../models/Package')
jest.mock('../audit.service')
jest.mock('../subscription.service')
jest.mock('../assignment.service', () => ({
  ALLOWED_DURATIONS: [30, 45, 60, 90],
  validateSchedulePayload: jest.fn(),
  createAssignmentRequest: jest.fn(),
  cancelAssignment: jest.fn(),
}))
jest.mock('../teachingSubject.service')

const User = require('../../models/User')
const TeacherWorkingHours = require('../../models/TeacherWorkingHours')
const OnboardingSession = require('../../models/OnboardingSession')
const AssignmentRequest = require('../../models/AssignmentRequest')
const ScheduleRule = require('../../models/ScheduleRule')
const Session = require('../../models/Session')
const Subscription = require('../../models/Subscription')
const LessonWallet = require('../../models/LessonWallet')
const LessonTransaction = require('../../models/LessonTransaction')
const Package = require('../../models/Package')
const { createSubscriptionWithOpeningBalance } = require('../subscription.service')
const assignmentService = require('../assignment.service')
const { isValidActiveKey } = require('../teachingSubject.service')

// Same six canonical keys the old static TEACHING_CATEGORIES allow-list
// covered — replicates its exact behavior so every existing test keeps
// working unchanged against the new catalog-backed (mocked here) check.
const LEGACY_CATEGORIES = ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other']
const {
  startOnboardingSession, getOnboardingSession, saveStudentToSession,
  removeStudentFromSession, finalizeOnboardingSession, cancelOnboardingSession,
} = require('../onboardingSession.service')
const { OnboardingError } = require('../onboarding.service')

// A Mongoose query is "thenable" and chainable (`.sort().populate()` etc. all
// return the query itself, and `await`-ing it resolves the final result) —
// this stand-in reproduces exactly that without a real ODM.
function query(result) {
  const q = {
    sort: () => q, populate: () => q, select: () => q, lean: () => q,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  }
  return q
}

const validTeacher = {
  firstNameAr: 'أحمد', lastNameAr: 'علي', email: 'teacher@example.com',
  gender: 'male', specializations: ['tajweed'], hourlyRate: 20,
}
const validStudent = {
  firstNameAr: 'سارة', lastNameAr: 'محمد', email: 'student@example.com', studentType: 'existing',
}

function mockUser(overrides = {}) {
  return {
    _id: overrides._id || 'u1', role: overrides.role, email: overrides.email,
    studentType: overrides.studentType, onboardingStatus: overrides.onboardingStatus,
    save: jest.fn().mockImplementation(function save() { return Promise.resolve(this) }),
    toPublic: () => ({ _id: overrides._id || 'u1', email: overrides.email, ...overrides }),
  }
}

function makeSession(overrides = {}) {
  const studentIds = overrides.studentIds || []
  studentIds.addToSet = function addToSet(id) { if (!this.some((x) => String(x) === String(id))) this.push(id) }
  return {
    _id: overrides._id || 'sess1',
    teacherId: overrides.teacherId || 't1',
    status: overrides.status || 'teacher_saved',
    studentIds,
    save: jest.fn().mockImplementation(function save() { return Promise.resolve(this) }),
    ...overrides,
    studentIds,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  User.findOne.mockResolvedValue(null) // no pre-existing email by default
  Package.find.mockResolvedValue([])
  isValidActiveKey.mockImplementation((key) => Promise.resolve(LEGACY_CATEGORIES.includes(key)))
  AssignmentRequest.findOne.mockReturnValue(query(null))
  Subscription.findOne.mockReturnValue(query(null))
  LessonWallet.findOne.mockReturnValue(query(null))
  Session.deleteMany.mockResolvedValue({})
  ScheduleRule.deleteMany.mockResolvedValue({})
  Subscription.deleteMany.mockResolvedValue({})
  LessonWallet.deleteMany.mockResolvedValue({})
  LessonTransaction.deleteMany.mockResolvedValue({})
  TeacherWorkingHours.deleteOne.mockResolvedValue({})
  TeacherWorkingHours.findOne.mockReturnValue(query(null))
  User.deleteOne.mockResolvedValue({})
})

describe('startOnboardingSession', () => {
  test('requires a clientRequestId', async () => {
    await expect(startOnboardingSession({ teacher: validTeacher, actorId: 'admin1' })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('persists the teacher BEFORE any student and marks it draft', async () => {
    OnboardingSession.findOne.mockResolvedValue(null)
    const teacherDoc = mockUser({ _id: 't1', role: 'teacher', email: validTeacher.email })
    User.create.mockResolvedValue(teacherDoc)
    TeacherWorkingHours.create.mockResolvedValue({ _id: 'wh1', teacherId: 't1' })
    OnboardingSession.create.mockResolvedValue(makeSession({ teacherId: 't1' }))

    const result = await startOnboardingSession({ clientRequestId: 'req-1', teacher: validTeacher, actorId: 'admin1' })

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'teacher', onboardingStatus: 'draft' }))
    expect(result.replayed).toBe(false)
    expect(result.teacher._id).toBe('t1')
  })

  test('a repeated call with the same clientRequestId replays instead of duplicating the teacher', async () => {
    OnboardingSession.findOne.mockResolvedValue(makeSession({ teacherId: 't1' }))
    User.findById.mockResolvedValue(mockUser({ _id: 't1', role: 'teacher' }))
    TeacherWorkingHours.findOne.mockReturnValue(query({ _id: 'wh1' }))

    const result = await startOnboardingSession({ clientRequestId: 'req-1', teacher: validTeacher, actorId: 'admin1' })
    expect(result.replayed).toBe(true)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects a duplicate teacher email without creating anything', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' })
    await expect(startOnboardingSession({ clientRequestId: 'req-2', teacher: validTeacher, actorId: 'admin1' }))
      .rejects.toMatchObject({ status: 409 })
    expect(User.create).not.toHaveBeenCalled()
  })
})

describe('saveStudentToSession', () => {
  test('rejects when the session does not exist', async () => {
    OnboardingSession.findById.mockResolvedValue(null)
    await expect(saveStudentToSession({ sessionId: 'sess1', student: validStudent, actorId: 'admin1' }))
      .rejects.toMatchObject({ status: 404 })
  })

  test('Student 1 is saved and reserves its schedule; Student 2 is independently saved without touching Student 1', async () => {
    const session = makeSession({ teacherId: 't1' })
    OnboardingSession.findById.mockResolvedValue(session)
    User.findOne.mockImplementation((filter) => Promise.resolve(filter?.role === 'teacher' ? mockUser({ _id: 't1', role: 'teacher' }) : null))
    const student1 = mockUser({ _id: 's1', role: 'student', studentType: 'existing', email: 'a@x.com' })
    User.create.mockResolvedValueOnce(student1)
    assignmentService.createAssignmentRequest.mockResolvedValueOnce({ assignmentRequest: { _id: 'req1', status: 'completed', schedule: { days: [{ dayOfWeek: 0, time: '12:00' }] }, lessonDurationMinutes: 60 } })

    const result1 = await saveStudentToSession({
      sessionId: 'sess1', clientRequestId: 'save-1', actorId: 'admin1',
      student: { ...validStudent, email: 'a@x.com', schedule: { days: [{ dayOfWeek: 0, time: '12:00' }], startDate: '2026-09-01', frequency: 'weekly' }, lessonDurationMinutes: 60, specialization: 'tajweed' },
    })
    expect(result1.replayed).toBe(false)
    expect([...session.studentIds]).toContain('s1')
    expect(assignmentService.createAssignmentRequest).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's1', teacherId: 't1', onboardingSessionId: session._id }))

    // Student 2 — a completely independent save.
    const student2 = mockUser({ _id: 's2', role: 'student', studentType: 'existing', email: 'b@x.com' })
    User.create.mockResolvedValueOnce(student2)
    assignmentService.createAssignmentRequest.mockResolvedValueOnce({ assignmentRequest: { _id: 'req2', status: 'completed', schedule: { days: [{ dayOfWeek: 2, time: '10:00' }] }, lessonDurationMinutes: 30 } })

    const result2 = await saveStudentToSession({
      sessionId: 'sess1', clientRequestId: 'save-2', actorId: 'admin1',
      student: { ...validStudent, email: 'b@x.com', schedule: { days: [{ dayOfWeek: 2, time: '10:00' }], startDate: '2026-09-01', frequency: 'weekly' }, lessonDurationMinutes: 30, specialization: 'tajweed' },
    })
    expect(result2.replayed).toBe(false)
    expect([...session.studentIds]).toEqual(['s1', 's2']) // Student 1 untouched, Student 2 appended
    expect(User.deleteOne).not.toHaveBeenCalled() // no rollback triggered for either
  })

  test('a repeated save with the same clientRequestId replays instead of duplicating', async () => {
    const session = makeSession({ teacherId: 't1', studentIds: ['s1'] })
    OnboardingSession.findById.mockResolvedValue(session)
    User.findOne.mockImplementation((filter) => Promise.resolve(filter?.role === 'teacher' ? mockUser({ _id: 't1', role: 'teacher' }) : null))
    AssignmentRequest.findOne.mockImplementation((filter) => {
      if (filter.correlationId === 'save-1:assignment') return query({ studentId: 's1' })
      return query(null)
    })
    User.findById.mockResolvedValue(mockUser({ _id: 's1', role: 'student' }))

    const result = await saveStudentToSession({ sessionId: 'sess1', clientRequestId: 'save-1', student: validStudent, actorId: 'admin1' })
    expect(result.replayed).toBe(true)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('a failure creating the assignment rolls back ONLY this student — never a sibling or the teacher', async () => {
    const session = makeSession({ teacherId: 't1' })
    OnboardingSession.findById.mockResolvedValue(session)
    User.findOne.mockImplementation((filter) => Promise.resolve(filter?.role === 'teacher' ? mockUser({ _id: 't1', role: 'teacher' }) : null))
    const student = mockUser({ _id: 's3', role: 'student', email: 'c@x.com' })
    User.create.mockResolvedValueOnce(student)
    assignmentService.createAssignmentRequest.mockRejectedValueOnce(Object.assign(new Error('slot taken'), { status: 409 }))

    await expect(saveStudentToSession({
      sessionId: 'sess1', clientRequestId: 'save-3', actorId: 'admin1',
      student: { ...validStudent, email: 'c@x.com', schedule: { days: [{ dayOfWeek: 0, time: '12:00' }], startDate: '2026-09-01', frequency: 'weekly' }, lessonDurationMinutes: 60, specialization: 'tajweed' },
    })).rejects.toMatchObject({ status: 409 })

    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 's3' })
    expect([...session.studentIds]).toEqual([]) // never added — the whole save is treated as never having happened
    expect(User.deleteOne).not.toHaveBeenCalledWith({ _id: 't1' }) // teacher untouched
  })

  test('does not claim success if a required subscription step fails', async () => {
    const session = makeSession({ teacherId: 't1' })
    OnboardingSession.findById.mockResolvedValue(session)
    User.findOne.mockImplementation((filter) => Promise.resolve(filter?.role === 'teacher' ? mockUser({ _id: 't1', role: 'teacher' }) : null))
    const student = mockUser({ _id: 's4', role: 'student', email: 'd@x.com' })
    User.create.mockResolvedValueOnce(student)
    Package.find.mockResolvedValue([{ _id: 'pkg1', isActive: true, sessionsPerMonth: 8 }])
    createSubscriptionWithOpeningBalance.mockRejectedValueOnce(new Error('package full'))

    await expect(saveStudentToSession({
      sessionId: 'sess1', clientRequestId: 'save-4', actorId: 'admin1',
      student: { ...validStudent, email: 'd@x.com', package: { packageId: 'pkg1' } },
    })).rejects.toThrow('package full')
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 's4' })
    expect([...session.studentIds]).toEqual([])
  })
})

describe('removeStudentFromSession', () => {
  test('cancels a pending reservation and removes the student without touching the teacher', async () => {
    const session = makeSession({ teacherId: 't1', studentIds: ['s1'] })
    OnboardingSession.findById.mockResolvedValue(session)
    AssignmentRequest.findOne.mockReturnValue(query({ _id: 'req1', status: 'pending_teacher_approval' }))

    await removeStudentFromSession({ sessionId: 'sess1', studentId: 's1', actorId: 'admin1', reason: 'test' })

    expect(assignmentService.cancelAssignment).toHaveBeenCalledWith(expect.objectContaining({ assignmentRequestId: 'req1' }))
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 's1' })
    expect([...session.studentIds]).toEqual([])
  })
})

describe('finalizeOnboardingSession', () => {
  test('is idempotent — finalizing an already-completed session just reloads it', async () => {
    OnboardingSession.findById.mockResolvedValue(makeSession({ teacherId: 't1', status: 'completed', studentIds: [] }))
    User.findById.mockResolvedValue(mockUser({ _id: 't1', role: 'teacher' }))
    const result = await finalizeOnboardingSession({ sessionId: 'sess1', actorId: 'admin1' })
    expect(result.replayed).toBe(true)
  })

  test('blocks finalization while a student has an unresolved rejected/time-change schedule', async () => {
    const session = makeSession({ teacherId: 't1', studentIds: ['s1'] })
    OnboardingSession.findById.mockResolvedValue(session)
    User.findOne.mockResolvedValue(mockUser({ _id: 't1', role: 'teacher' }))
    User.findById.mockResolvedValue(mockUser({ _id: 's1', role: 'student' }))
    AssignmentRequest.findOne.mockReturnValue(query({ status: 'rejected' }))

    await expect(finalizeOnboardingSession({ sessionId: 'sess1', actorId: 'admin1' })).rejects.toMatchObject({ status: 409 })
  })

  test('marks the teacher complete and the session completed when every student is clean', async () => {
    const session = makeSession({ teacherId: 't1', studentIds: [] })
    OnboardingSession.findById.mockResolvedValue(session)
    const teacherDoc = mockUser({ _id: 't1', role: 'teacher', onboardingStatus: 'draft' })
    User.findOne.mockResolvedValue(teacherDoc)
    User.findById.mockResolvedValue(teacherDoc)

    const result = await finalizeOnboardingSession({ sessionId: 'sess1', actorId: 'admin1' })
    expect(teacherDoc.onboardingStatus).toBe('complete')
    expect(teacherDoc.save).toHaveBeenCalled()
    expect(session.status).toBe('completed')
    expect(result.replayed).toBe(false)
  })
})

describe('cancelOnboardingSession', () => {
  test('requires an explicit reason', async () => {
    OnboardingSession.findById.mockResolvedValue(makeSession({ teacherId: 't1' }))
    await expect(cancelOnboardingSession({ sessionId: 'sess1', actorId: 'admin1' })).rejects.toMatchObject({ status: 400 })
  })

  test('deletes the teacher and every student saved in this session', async () => {
    const session = makeSession({ teacherId: 't1', studentIds: ['s1', 's2'] })
    OnboardingSession.findById.mockImplementation(() => Promise.resolve(session))
    AssignmentRequest.findOne.mockReturnValue(query(null))

    await cancelOnboardingSession({ sessionId: 'sess1', actorId: 'admin1', reason: 'تراجع الإدارة' })

    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 's1' })
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 's2' })
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 't1' })
    expect(session.status).toBe('cancelled')
  })
})

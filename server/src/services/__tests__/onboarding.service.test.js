// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) exercising the real
// "create a teacher with their students" wizard logic: duplicate-email
// rejection, multi-student creation, compensating rollback on partial
// failure, and idempotent replay.
jest.mock('../../models/User')
jest.mock('../../models/TeacherWorkingHours')
jest.mock('../../models/Subscription')
jest.mock('../../models/LessonWallet')
jest.mock('../../models/LessonTransaction')
jest.mock('../../models/OnboardingRequest')
jest.mock('../../models/AssignmentRequest')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/Session')
jest.mock('../../models/Package')
jest.mock('../subscription.service')
jest.mock('../../services/audit.service')
jest.mock('../assignment.service', () => ({
  ALLOWED_DURATIONS: [30, 45, 60, 90],
  validateSchedulePayload: jest.fn(),
  createAssignmentRequest: jest.fn(),
}))
jest.mock('../teachingSubject.service')

const User = require('../../models/User')
const TeacherWorkingHours = require('../../models/TeacherWorkingHours')
const Subscription = require('../../models/Subscription')
const LessonWallet = require('../../models/LessonWallet')
const LessonTransaction = require('../../models/LessonTransaction')
const OnboardingRequest = require('../../models/OnboardingRequest')
const AssignmentRequest = require('../../models/AssignmentRequest')
const ScheduleRule = require('../../models/ScheduleRule')
const Session = require('../../models/Session')
const Package = require('../../models/Package')
const { createSubscriptionWithOpeningBalance } = require('../subscription.service')
const assignmentService = require('../assignment.service')
const { isValidActiveKey } = require('../teachingSubject.service')
const { createTeacherWithStudents, OnboardingError } = require('../onboarding.service')

// Same six canonical keys the old static TEACHING_CATEGORIES allow-list
// covered — replicates its exact behavior so every existing test keeps
// working unchanged against the new catalog-backed (mocked here) check.
const LEGACY_CATEGORIES = ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other']

const validTeacher = {
  firstNameAr: 'أحمد', lastNameAr: 'علي', email: 'teacher@example.com',
  gender: 'male', specializations: ['tajweed'], hourlyRate: 20,
}

function mockCreatedUser(overrides = {}) {
  return {
    _id: overrides._id || 'u1',
    email: overrides.email,
    specializations: overrides.specializations,
    audienceCategories: [],
    hourlyRate: overrides.hourlyRate,
    studentType: overrides.studentType,
    toPublic: () => ({ _id: overrides._id || 'u1', email: overrides.email }),
  }
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) — clearAllMocks does NOT drain queued
  // mockResolvedValueOnce/mockRejectedValueOnce implementations, so a test
  // that throws before consuming all of its queued once-values would leak
  // them into the next test. resetAllMocks removes implementations
  // entirely, so every test's mocks are re-established from scratch below.
  jest.resetAllMocks()
  User.find.mockResolvedValue([]) // no pre-existing emails by default
  Package.find.mockResolvedValue([])
  TeacherWorkingHours.create.mockResolvedValue({ _id: 'wh1', teacherId: 't1' })
  OnboardingRequest.findOne.mockResolvedValue(null)
  isValidActiveKey.mockImplementation((key) => Promise.resolve(LEGACY_CATEGORIES.includes(key)))
  OnboardingRequest.create.mockResolvedValue({})
})

describe('createTeacherWithStudents — validation', () => {
  test('rejects a missing teacher payload', async () => {
    await expect(createTeacherWithStudents({ teacher: null, actorId: 'admin1' })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects a teacher with no gender', async () => {
    await expect(createTeacherWithStudents({ teacher: { ...validTeacher, gender: undefined }, actorId: 'admin1' }))
      .rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects a teacher with no specializations', async () => {
    await expect(createTeacherWithStudents({ teacher: { ...validTeacher, specializations: [] }, actorId: 'admin1' }))
      .rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects a student with no studentType', async () => {
    await expect(createTeacherWithStudents({
      teacher: validTeacher, students: [{ firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com' }], actorId: 'admin1',
    })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects duplicate emails within the same request', async () => {
    await expect(createTeacherWithStudents({
      teacher: validTeacher,
      students: [
        { firstNameAr: 'أ', lastNameAr: 'ب', email: 'dup@example.com', studentType: 'new' },
        { firstNameAr: 'ج', lastNameAr: 'د', email: 'DUP@example.com', studentType: 'new' },
      ],
      actorId: 'admin1',
    })).rejects.toThrow(/مستخدم أكثر من مرة/)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects when the teacher email already exists in the database', async () => {
    User.find.mockResolvedValue([{ email: 'teacher@example.com' }])
    await expect(createTeacherWithStudents({ teacher: validTeacher, actorId: 'admin1' }))
      .rejects.toMatchObject({ status: 409 })
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects invalid working-hours periods before any write', async () => {
    await expect(createTeacherWithStudents({
      teacher: validTeacher,
      workingHours: { days: [{ dayOfWeek: 0, mode: 'custom', periods: [{ start: '14:00', end: '10:00' }] }] },
      actorId: 'admin1',
    })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })
})

describe('createTeacherWithStudents — happy paths', () => {
  test('creates a teacher with one student (no package)', async () => {
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com', specializations: ['tajweed'], hourlyRate: 20 }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's1', email: 'student@example.com', studentType: 'new' }))

    const result = await createTeacherWithStudents({
      teacher: validTeacher,
      students: [{ firstNameAr: 'س', lastNameAr: 'ط', email: 'student@example.com', studentType: 'new' }],
      actorId: 'admin1',
    })

    expect(User.create).toHaveBeenCalledTimes(2)
    expect(result.students).toHaveLength(1)
    expect(createSubscriptionWithOpeningBalance).not.toHaveBeenCalled()
  })

  test('creates a teacher with multiple students, each with their own package/opening balance', async () => {
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's1', email: 's1@example.com', studentType: 'existing' }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's2', email: 's2@example.com', studentType: 'new' }))

    Package.find.mockResolvedValue([
      { _id: 'pkg1', sessionsPerMonth: 10, isActive: true },
      { _id: 'pkg2', sessionsPerMonth: 10, isActive: true },
    ])
    createSubscriptionWithOpeningBalance
      .mockResolvedValueOnce({ subscription: { _id: 'sub1' }, used: 6, remaining: 4 })
      .mockResolvedValueOnce({ subscription: { _id: 'sub2' }, used: 0, remaining: 10 })

    const result = await createTeacherWithStudents({
      teacher: validTeacher,
      students: [
        { firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'existing', package: { packageId: 'pkg1', lessonsUsed: 6 } },
        { firstNameAr: 'ي', lastNameAr: 'ك', email: 's2@example.com', studentType: 'new', package: { packageId: 'pkg2' } },
      ],
      actorId: 'admin1',
    })

    expect(User.create).toHaveBeenCalledTimes(3) // 1 teacher + 2 students
    expect(createSubscriptionWithOpeningBalance).toHaveBeenCalledTimes(2)
    expect(result.students[0].openingBalance).toEqual({ used: 6, remaining: 4 })
    expect(result.students[1].openingBalance).toEqual({ used: 0, remaining: 10 })
  })
})

describe('createTeacherWithStudents — rollback on partial failure', () => {
  test('rolls back the teacher, working hours, and any already-created students when a later student fails', async () => {
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' })) // teacher
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's1', email: 's1@example.com', studentType: 'new' })) // student 1 ok
      .mockRejectedValueOnce(new Error('DB write failed')) // student 2 fails

    User.deleteMany.mockResolvedValue({})
    User.deleteOne.mockResolvedValue({})
    TeacherWorkingHours.deleteOne.mockResolvedValue({})
    LessonWallet.deleteMany.mockResolvedValue({})
    LessonTransaction.deleteMany.mockResolvedValue({})
    Subscription.deleteMany.mockResolvedValue({})

    await expect(createTeacherWithStudents({
      teacher: validTeacher,
      students: [
        { firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'new' },
        { firstNameAr: 'ي', lastNameAr: 'ك', email: 's2@example.com', studentType: 'new' },
      ],
      actorId: 'admin1',
    })).rejects.toThrow('DB write failed')

    // Compensating rollback must clean up exactly what THIS call created.
    expect(User.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['s1'] } })
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 't1' })
    expect(TeacherWorkingHours.deleteOne).toHaveBeenCalledWith({ teacherId: 't1' })
    // Never reports success for a partially-completed operation.
    expect(OnboardingRequest.create).not.toHaveBeenCalled()
  })

  test('rolls back the whole teacher+student when the subscription step fails', async () => {
    Package.find.mockResolvedValue([{ _id: 'pkg1', sessionsPerMonth: 10, isActive: true }])
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's1', email: 's1@example.com', studentType: 'new' }))
    createSubscriptionWithOpeningBalance.mockRejectedValueOnce(new Error('opening balance invalid'))
    User.deleteMany.mockResolvedValue({})
    User.deleteOne.mockResolvedValue({})
    TeacherWorkingHours.deleteOne.mockResolvedValue({})

    await expect(createTeacherWithStudents({
      teacher: validTeacher,
      students: [{ firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'new', package: { packageId: 'pkg1' } }],
      actorId: 'admin1',
    })).rejects.toThrow('opening balance invalid')

    expect(User.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['s1'] } })
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 't1' })
  })
})

describe('createTeacherWithStudents — idempotent replay', () => {
  test('a repeated call with the same clientRequestId returns the cached result instead of creating anything new', async () => {
    const cachedSummary = { teacher: { _id: 't1' }, students: [], workingHours: {} }
    OnboardingRequest.findOne.mockResolvedValue({ resultSummary: cachedSummary })

    const result = await createTeacherWithStudents({ clientRequestId: 'req-123', teacher: validTeacher, actorId: 'admin1' })

    expect(result.replayed).toBe(true)
    expect(result.teacher).toEqual({ _id: 't1' })
    expect(User.create).not.toHaveBeenCalled()
  })

  test('persists an OnboardingRequest keyed by clientRequestId on a fresh success', async () => {
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
    await createTeacherWithStudents({ clientRequestId: 'req-456', teacher: validTeacher, actorId: 'admin1' })
    expect(OnboardingRequest.create).toHaveBeenCalledWith(expect.objectContaining({ clientRequestId: 'req-456', teacherId: 't1' }))
  })
})

describe('createTeacherWithStudents — credential modes', () => {
  test('rejects a weak administrator-defined teacher password before any write', async () => {
    await expect(createTeacherWithStudents({
      teacher: { ...validTeacher, credential: { mode: 'manual', password: '123' } }, actorId: 'admin1',
    })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects a confirmation mismatch before any write', async () => {
    await expect(createTeacherWithStudents({
      teacher: { ...validTeacher, credential: { mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Other123' } }, actorId: 'admin1',
    })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  // Phase 2 meeting addendum §1: manual mode's requirePasswordChange default
  // flipped from true -> false.
  test('a manual credential with requirePasswordChange defaulted (false) does not force a change and returns no temp password', async () => {
    User.create.mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
    const result = await createTeacherWithStudents({
      teacher: { ...validTeacher, credential: { mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Abcdef12' } }, actorId: 'admin1',
    })
    expect(User.create.mock.calls[0][0]).toMatchObject({ password: 'Abcdef12', mustChangePassword: false })
    expect(result.temporaryPasswords.teacher).toBeUndefined()
  })

  test('a manual credential with requirePasswordChange:true forces a change', async () => {
    User.create.mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
    await createTeacherWithStudents({
      teacher: { ...validTeacher, credential: { mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Abcdef12', requirePasswordChange: true } },
      actorId: 'admin1',
    })
    expect(User.create.mock.calls[0][0]).toMatchObject({ mustChangePassword: true })
  })

  test('a student with a weak manual password is rejected before any write', async () => {
    await expect(createTeacherWithStudents({
      teacher: validTeacher,
      students: [{ firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'new', credential: { mode: 'manual', password: 'weak' } }],
      actorId: 'admin1',
    })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('auto mode (default) still returns a real one-time temporary password and forces a change', async () => {
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's1', email: 's1@example.com', studentType: 'new' }))
    const result = await createTeacherWithStudents({
      teacher: validTeacher,
      students: [{ firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'new' }],
      actorId: 'admin1',
    })
    expect(result.temporaryPasswords.teacher).toEqual(expect.any(String))
    expect(User.create.mock.calls[0][0].mustChangePassword).toBe(true)
    expect(result.students[0].temporaryPassword).toEqual(expect.any(String))
  })
})

describe('createTeacherWithStudents — schedule/assignment integration', () => {
  const scheduleInput = { days: [{ dayOfWeek: 0, time: '10:00' }], startDate: '2026-09-01' }

  test('a student with a schedule triggers createAssignmentRequest and records its result', async () => {
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's1', email: 's1@example.com', studentType: 'existing' }))
    assignmentService.createAssignmentRequest.mockResolvedValue({
      assignmentRequest: { _id: 'areq1', status: 'completed', activationResult: { scheduleRuleIds: ['rule1'], sessionIds: ['sess1', 'sess2'] } },
    })

    const result = await createTeacherWithStudents({
      teacher: validTeacher,
      students: [{
        firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'existing',
        specialization: 'tajweed', lessonDurationMinutes: 60, schedule: scheduleInput,
      }],
      actorId: 'admin1', overrideAllowed: false,
    })

    expect(assignmentService.createAssignmentRequest).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 's1', teacherId: 't1', studentType: 'existing', specialization: 'tajweed', lessonDurationMinutes: 60,
    }))
    expect(result.students[0].assignmentRequest).toMatchObject({ _id: 'areq1', status: 'completed', immediateAssignment: true })
  })

  test('rejects an invalid specialization for a scheduled student before any write', async () => {
    await expect(createTeacherWithStudents({
      teacher: validTeacher,
      students: [{
        firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'existing',
        specialization: 'not_a_real_one', lessonDurationMinutes: 60, schedule: scheduleInput,
      }],
      actorId: 'admin1',
    })).rejects.toThrow(OnboardingError)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rolls back the ScheduleRule/Session/AssignmentRequest created for an earlier student when a later step fails', async () => {
    User.create
      .mockResolvedValueOnce(mockCreatedUser({ _id: 't1', email: 'teacher@example.com' }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's1', email: 's1@example.com', studentType: 'existing' }))
      .mockResolvedValueOnce(mockCreatedUser({ _id: 's2', email: 's2@example.com', studentType: 'existing' }))
    assignmentService.createAssignmentRequest
      .mockResolvedValueOnce({ assignmentRequest: { _id: 'areq1', status: 'completed', activationResult: { scheduleRuleIds: ['rule1'], sessionIds: ['sess1'] } } })
      .mockRejectedValueOnce(new Error('الموعد غير متاح'))
    User.deleteMany.mockResolvedValue({})
    User.deleteOne.mockResolvedValue({})
    TeacherWorkingHours.deleteOne.mockResolvedValue({})
    LessonWallet.deleteMany.mockResolvedValue({})
    LessonTransaction.deleteMany.mockResolvedValue({})
    Subscription.deleteMany.mockResolvedValue({})
    AssignmentRequest.deleteMany.mockResolvedValue({})
    ScheduleRule.deleteMany.mockResolvedValue({})
    Session.deleteMany.mockResolvedValue({})

    await expect(createTeacherWithStudents({
      teacher: validTeacher,
      students: [
        { firstNameAr: 'س', lastNameAr: 'ط', email: 's1@example.com', studentType: 'existing', specialization: 'tajweed', lessonDurationMinutes: 60, schedule: scheduleInput },
        { firstNameAr: 'ي', lastNameAr: 'ك', email: 's2@example.com', studentType: 'existing', specialization: 'tajweed', lessonDurationMinutes: 60, schedule: scheduleInput },
      ],
      actorId: 'admin1',
    })).rejects.toThrow('الموعد غير متاح')

    expect(ScheduleRule.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['rule1'] } })
    expect(Session.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['sess1'] } })
    expect(AssignmentRequest.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['areq1'] } })
    expect(User.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['s1', 's2'] } })
  })
})

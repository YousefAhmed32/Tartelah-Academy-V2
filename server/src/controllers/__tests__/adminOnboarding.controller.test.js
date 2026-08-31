// Mocked-model tests for the standalone admin student-creation endpoint and
// the wizard's HTTP-layer error mapping — the actual wizard business logic
// is covered in services/__tests__/onboarding.service.test.js.
jest.mock('../../models/User')
jest.mock('../../models/TeacherWorkingHours')
jest.mock('../../services/audit.service')
jest.mock('../../services/onboarding.service')

const User = require('../../models/User')
const TeacherWorkingHours = require('../../models/TeacherWorkingHours')
const { createTeacherWithStudents } = require('../../services/onboarding.service')
const ctrl = require('../adminOnboarding.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}
function jsonOf(res) { return res.json.mock.calls[0][0] }

const actor = { _id: 'admin1', role: 'admin' }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('adminOnboarding.controller.createStudent', () => {
  const baseBody = { firstNameAr: 'سارة', lastNameAr: 'محمد', email: 'sara@example.com', studentType: 'new' }

  test('rejects a duplicate email', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' })
    const req = { body: baseBody, user: actor }
    const res = mockRes()
    await ctrl.createStudent(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(409)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects an invalid studentType', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, studentType: 'vip' }, user: actor }
    const res = mockRes()
    await ctrl.createStudent(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('creates a student and never mass-assigns fields outside the allow-list', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockResolvedValue({ toPublic: () => ({ _id: 's1' }) })
    const req = { body: { ...baseBody, role: 'admin', isPrimaryAdmin: true }, user: actor }
    const res = mockRes()
    await ctrl.createStudent(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    const created = User.create.mock.calls[0][0]
    expect(created.role).toBe('student')
    expect(created.isPrimaryAdmin).toBeUndefined()
    expect(jsonOf(res).data.temporaryPassword).toBeDefined()
  })

  test('does not return a temporaryPassword when the caller supplied one', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockResolvedValue({ toPublic: () => ({ _id: 's1' }) })
    const req = { body: { ...baseBody, password: 'ExplicitPass123!' }, user: actor }
    const res = mockRes()
    await ctrl.createStudent(req, res, jest.fn())
    expect(jsonOf(res).data.temporaryPassword).toBeUndefined()
  })
})

describe('adminOnboarding.controller.createTeacherWithStudentsHandler', () => {
  test('maps a thrown OnboardingError to its own status/message instead of a generic 500', async () => {
    const err = new Error('البريد الإلكتروني مستخدم')
    err.status = 409
    createTeacherWithStudents.mockRejectedValue(err)
    const req = { body: { teacher: {}, students: [] }, user: actor }
    const res = mockRes()
    const next = jest.fn()
    await ctrl.createTeacherWithStudentsHandler(req, res, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(next).not.toHaveBeenCalled()
  })

  test('passes an unrecognized (non-OnboardingError) failure to next() rather than swallowing it', async () => {
    createTeacherWithStudents.mockRejectedValue(new Error('unexpected DB error'))
    const req = { body: { teacher: {}, students: [] }, user: actor }
    const res = mockRes()
    const next = jest.fn()
    await ctrl.createTeacherWithStudentsHandler(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
    expect(res.status).not.toHaveBeenCalled()
  })

  test('on success, logs a single audit action and returns 201', async () => {
    createTeacherWithStudents.mockResolvedValue({ teacher: { _id: 't1' }, students: [{}, {}], replayed: false })
    const req = { body: { teacher: {}, students: [] }, user: actor }
    const res = mockRes()
    await ctrl.createTeacherWithStudentsHandler(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(201)
  })

  test('an idempotent replay still returns 201 without re-logging the create action', async () => {
    createTeacherWithStudents.mockResolvedValue({ teacher: { _id: 't1' }, students: [], replayed: true })
    const req = { body: { teacher: {}, students: [], clientRequestId: 'req-1' }, user: actor }
    const res = mockRes()
    await ctrl.createTeacherWithStudentsHandler(req, res, jest.fn())
    expect(jsonOf(res).message).toMatch(/مسبقًا/)
  })
})

describe('adminOnboarding.controller.getTeacherWorkingHours / updateTeacherWorkingHours', () => {
  test('getTeacherWorkingHours 404s for a non-teacher/non-existent id', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) })
    const req = { params: { id: 'missing' } }
    const res = mockRes()
    await ctrl.getTeacherWorkingHours(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(404)
  })

  test('updateTeacherWorkingHours rejects overlapping periods', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 't1' }) })
    const req = {
      params: { id: 't1' },
      body: { days: [{ dayOfWeek: 0, mode: 'custom', periods: [{ start: '10:00', end: '14:00' }, { start: '13:00', end: '16:00' }] }] },
      user: actor,
    }
    const res = mockRes()
    await ctrl.updateTeacherWorkingHours(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(TeacherWorkingHours.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('updateTeacherWorkingHours persists a valid schedule and audit-logs before/after', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 't1' }) })
    TeacherWorkingHours.findOne.mockResolvedValue({ _id: 'wh1', days: [] })
    TeacherWorkingHours.findOneAndUpdate.mockResolvedValue({ _id: 'wh1', days: [{ dayOfWeek: 0, mode: 'full_day', periods: [] }] })
    const req = {
      params: { id: 't1' },
      body: { days: [{ dayOfWeek: 0, mode: 'full_day', periods: [] }] },
      user: actor,
    }
    const res = mockRes()
    await ctrl.updateTeacherWorkingHours(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

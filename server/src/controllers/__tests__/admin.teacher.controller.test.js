// Regression tests for the teacher-management category/hourlyRate/
// availableShifts feature — mocked User model, same rationale as
// course.controller.test.js (no live DB test infrastructure in this repo):
// exercises the real controller validation logic, i.e. exactly what would
// be passed to Mongoose, without a live database.

jest.mock('../../models/User')
jest.mock('../../services/audit.service')
jest.mock('../../services/teachingSubject.service')
const User = require('../../models/User')
const { logAction } = require('../../services/audit.service')
const { isValidActiveKey } = require('../../services/teachingSubject.service')
const ctrl = require('../admin.controller')

// Same six canonical keys the old static TEACHING_CATEGORIES allow-list
// covered — replicates its exact behavior so every existing test keeps
// working unchanged against the new catalog-backed (mocked here) check.
const LEGACY_CATEGORIES = ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other']

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}

function jsonOf(res) {
  return res.json.mock.calls[0][0]
}

const actor = { _id: 'admin1', role: 'admin' }

// updateTeacher fetches the pre-update document (for the hourlyRate-change
// audit diff) via User.findOne(...).select(...) before calling
// findOneAndUpdate — every updateTeacher test below stubs that lookup.
function mockBeforeLookup(doc) {
  User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(doc) })
}

beforeEach(() => {
  jest.clearAllMocks()
  isValidActiveKey.mockImplementation((key) => Promise.resolve(LEGACY_CATEGORIES.includes(key)))
})

describe('admin.controller.createTeacher — category/hourlyRate/availableShifts', () => {
  const baseBody = {
    firstNameAr: 'أحمد', lastNameAr: 'علي', email: 'teacher@example.com', password: 'password123',
    gender: 'male', category: 'tajweed', hourlyRate: 15, availableShifts: ['morning', 'evening'],
  }

  test('rejects create with no category or specializations', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, category: undefined }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with negative hourlyRate', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, hourlyRate: -5 }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with malformed hourlyRate string', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, hourlyRate: 'abc' }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with an empty availableShifts array', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, availableShifts: [] }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with an invalid shift value', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, availableShifts: ['midnight'] }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with an invalid category value', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, category: 'not-a-real-category' }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with an invalid audienceCategories value', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, audienceCategories: ['elderly'] }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('accepts create with only specializations[] (no legacy category)', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockResolvedValue({ _id: 't1', specializations: ['hifz', 'tajweed'], audienceCategories: [], hourlyRate: 15, toPublic: () => ({ _id: 't1' }) })
    const req = { body: { ...baseBody, category: undefined, specializations: ['hifz', 'tajweed'] }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(201)
  })

  test('accepts a fully valid create payload (morning + evening) and never mass-assigns unexpected fields', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockResolvedValue({ toPublic: () => ({ _id: 't1', ...baseBody, role: 'teacher' }) })
    const req = { body: { ...baseBody, role: 'admin', isPrimaryAdmin: true, permissions: ['admins.create'] }, user: actor }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(User.create).toHaveBeenCalledTimes(1)
    const created = User.create.mock.calls[0][0]
    expect(created.category).toBe('tajweed')
    expect(created.hourlyRate).toBe(15)
    expect(created.availableShifts).toEqual(['morning', 'evening'])
    // Explicit allow-list — role is always forced to 'teacher', and fields
    // outside the allow-list (isPrimaryAdmin/permissions) are never passed
    // through regardless of what the request body contains.
    expect(created.role).toBe('teacher')
    expect(created.isPrimaryAdmin).toBeUndefined()
    expect(created.permissions).toBeUndefined()
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.create_teacher' }))
  })

  test.each([['morning only', ['morning']], ['evening only', ['evening']], ['both', ['morning', 'evening']]])(
    'accepts availableShifts: %s',
    async (_label, shifts) => {
      User.findOne.mockResolvedValue(null)
      User.create.mockResolvedValue({ toPublic: () => ({ _id: 't1' }) })
      const req = { body: { ...baseBody, availableShifts: shifts }, user: actor }
      const res = mockRes()
      await ctrl.createTeacher(req, res, jest.fn())
      expect(res.status).toHaveBeenCalledWith(201)
    }
  )
})

describe('admin.controller.updateTeacher — backward compatibility & validation', () => {
  test('updating an unrelated field on a legacy teacher (no category/hourlyRate/shifts) does not require them', async () => {
    mockBeforeLookup({ _id: 't1', hourlyRate: 0 })
    User.findOneAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 't1', phone: '0100000000' }) })
    const req = { params: { id: 't1' }, body: { phone: '0100000000' }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(jsonOf(res).success).toBe(true)
  })

  test('rejects update with an invalid category', async () => {
    const req = { params: { id: 't1' }, body: { category: 'invalid' }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('rejects update with a negative hourlyRate', async () => {
    const req = { params: { id: 't1' }, body: { hourlyRate: -1 }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('rejects update with an invalid shift value', async () => {
    const req = { params: { id: 't1' }, body: { availableShifts: ['night'] }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('rejects update with an invalid specializations value', async () => {
    const req = { params: { id: 't1' }, body: { specializations: ['not-real'] }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('persists a valid category/hourlyRate/availableShifts update and logs the hourlyRate change', async () => {
    mockBeforeLookup({ _id: 't1', hourlyRate: 10 })
    const select = jest.fn().mockResolvedValue({ _id: 't1', category: 'hifz', hourlyRate: 20, availableShifts: ['evening'] })
    User.findOneAndUpdate.mockReturnValue({ select })
    const req = { params: { id: 't1' }, body: { category: 'hifz', hourlyRate: 20, availableShifts: ['evening'] }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    const [, updates] = User.findOneAndUpdate.mock.calls[0]
    expect(updates).toEqual({ category: 'hifz', hourlyRate: 20, availableShifts: ['evening'] })
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.update_teacher_hourly_rate', changes: { before: 10, after: 20 } }))
  })

  test('does not log an hourlyRate change entry when hourlyRate is untouched', async () => {
    mockBeforeLookup({ _id: 't1', hourlyRate: 10 })
    User.findOneAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 't1', phone: '0101112222' }) })
    const req = { params: { id: 't1' }, body: { phone: '0101112222' }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(logAction).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.update_teacher_hourly_rate' }))
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.update_teacher' }))
  })

  test('returns 404 when the teacher does not exist', async () => {
    mockBeforeLookup(null)
    const req = { params: { id: 'missing' }, body: { phone: '0100000000' }, user: actor }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(404)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })
})

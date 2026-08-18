// Regression tests for the teacher-management category/hourlyRate/
// availableShifts feature — mocked User model, same rationale as
// course.controller.test.js (no live DB test infrastructure in this repo):
// exercises the real controller validation logic, i.e. exactly what would
// be passed to Mongoose, without a live database.

jest.mock('../../models/User')
const User = require('../../models/User')
const ctrl = require('../admin.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}

function jsonOf(res) {
  return res.json.mock.calls[0][0]
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('admin.controller.createTeacher — category/hourlyRate/availableShifts', () => {
  const baseBody = {
    firstNameAr: 'أحمد', lastNameAr: 'علي', email: 'teacher@example.com', password: 'password123',
    gender: 'male', category: 'tajweed', hourlyRate: 15, availableShifts: ['morning', 'evening'],
  }

  test('rejects create with no category', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, category: undefined } }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with negative hourlyRate', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, hourlyRate: -5 } }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with malformed hourlyRate string', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, hourlyRate: 'abc' } }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with an empty availableShifts array', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, availableShifts: [] } }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with an invalid shift value', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, availableShifts: ['midnight'] } }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('rejects create with an invalid category value', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { ...baseBody, category: 'not-a-real-category' } }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('accepts a fully valid create payload (morning + evening)', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockResolvedValue({ toPublic: () => ({ _id: 't1', ...baseBody, role: 'teacher' }) })
    const req = { body: baseBody }
    const res = mockRes()
    await ctrl.createTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(User.create).toHaveBeenCalledTimes(1)
    const created = User.create.mock.calls[0][0]
    expect(created.category).toBe('tajweed')
    expect(created.hourlyRate).toBe(15)
    expect(created.availableShifts).toEqual(['morning', 'evening'])
  })

  test.each([['morning only', ['morning']], ['evening only', ['evening']], ['both', ['morning', 'evening']]])(
    'accepts availableShifts: %s',
    async (_label, shifts) => {
      User.findOne.mockResolvedValue(null)
      User.create.mockResolvedValue({ toPublic: () => ({ _id: 't1' }) })
      const req = { body: { ...baseBody, availableShifts: shifts } }
      const res = mockRes()
      await ctrl.createTeacher(req, res, jest.fn())
      expect(res.status).toHaveBeenCalledWith(201)
    }
  )
})

describe('admin.controller.updateTeacher — backward compatibility & validation', () => {
  test('updating an unrelated field on a legacy teacher (no category/hourlyRate/shifts) does not require them', async () => {
    User.findOneAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 't1', phone: '0100000000' }) })
    const req = { params: { id: 't1' }, body: { phone: '0100000000' } }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    expect(jsonOf(res).success).toBe(true)
  })

  test('rejects update with an invalid category', async () => {
    const req = { params: { id: 't1' }, body: { category: 'invalid' } }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('rejects update with a negative hourlyRate', async () => {
    const req = { params: { id: 't1' }, body: { hourlyRate: -1 } }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('rejects update with an invalid shift value', async () => {
    const req = { params: { id: 't1' }, body: { availableShifts: ['night'] } }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('persists a valid category/hourlyRate/availableShifts update', async () => {
    const select = jest.fn().mockResolvedValue({ _id: 't1', category: 'hifz', hourlyRate: 20, availableShifts: ['evening'] })
    User.findOneAndUpdate.mockReturnValue({ select })
    const req = { params: { id: 't1' }, body: { category: 'hifz', hourlyRate: 20, availableShifts: ['evening'] } }
    const res = mockRes()
    await ctrl.updateTeacher(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(200)
    const [, updates] = User.findOneAndUpdate.mock.calls[0]
    expect(updates).toEqual({ category: 'hifz', hourlyRate: 20, availableShifts: ['evening'] })
  })
})

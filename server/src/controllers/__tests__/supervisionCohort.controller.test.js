jest.mock('../../models/SupervisionCohort')
jest.mock('../../models/SupervisionCohortMember')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/User')
jest.mock('../../services/audit.service')

const Cohort = require('../../models/SupervisionCohort')
const Member = require('../../models/SupervisionCohortMember')
const Assignment = require('../../models/SupervisionAssignment')
const User = require('../../models/User')
const controller = require('../supervisionCohort.controller')

const personId = '507f1f77bcf86cd799439011'
const groupId = '507f1f77bcf86cd799439012'
const studentId = '507f1f77bcf86cd799439013'
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
const manager = { _id: personId, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'manager', hasPermission: () => true }
const supervisor = { ...manager, supervisionPosition: 'supervisor' }

beforeEach(() => jest.clearAllMocks())

test('a manager cannot create a group in another supervision team', async () => {
  const res = response()
  await controller.create({ user: manager, body: { team: 'administrative', name: 'مجموعة', studentIds: [] } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Cohort.create).not.toHaveBeenCalled()
})

test('a student cannot be placed in two active groups of the same team', async () => {
  User.countDocuments.mockResolvedValue(1)
  Member.exists.mockResolvedValue({ _id: groupId })
  const res = response()
  await controller.create({ user: manager, body: { team: 'academic', name: 'مجموعة', studentIds: [studentId] } }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(409)
  expect(Cohort.create).not.toHaveBeenCalled()
})

test('a supervisor cannot open an unassigned group in their own team', async () => {
  Cohort.findById.mockReturnValue({ lean: async () => ({ _id: groupId, team: 'academic' }) })
  Assignment.exists.mockResolvedValue(false)
  const res = response()
  await controller.detail({ user: supervisor, params: { id: groupId }, query: {} }, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Member.find).not.toHaveBeenCalled()
})

test('reopening a cohort preserves closed memberships and assignments', async () => {
  const row = { _id: groupId, team: 'academic', isActive: false, save: jest.fn().mockResolvedValue(true) }
  Cohort.findById.mockResolvedValue(row)
  const res = response()
  await controller.update({ user: manager, params: { id: groupId }, body: { isActive: true } }, res, jest.fn())
  expect(row.isActive).toBe(true)
  expect(row.save).toHaveBeenCalled()
  expect(Member.updateMany).not.toHaveBeenCalled()
  expect(Assignment.updateMany).not.toHaveBeenCalled()
  expect(res.status).toHaveBeenCalledWith(200)
})

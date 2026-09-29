jest.mock('../../models/User')
jest.mock('../../models/Session')
jest.mock('../../models/SupervisionShift')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionSettings')
jest.mock('../../models/TeachingSubject')
jest.mock('../../models/AuditLog')
jest.mock('../../services/audit.service')
jest.mock('../../services/supervisionPersonnel.service')
jest.mock('../../services/supervisionNotification.service')

const User = require('../../models/User')
const Session = require('../../models/Session')
const Shift = require('../../models/SupervisionShift')
const Assignment = require('../../models/SupervisionAssignment')
const Settings = require('../../models/SupervisionSettings')
const { hasFutureWork } = require('../../services/supervisionPersonnel.service')
const ctrl = require('../supervisionManagement.controller')

const teacher = '507f1f77bcf86cd799439011'
const supervisor = '507f1f77bcf86cd799439012'
const personId = '507f1f77bcf86cd799439013'
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
const actor = (team = 'academic', position = 'manager') => ({ _id: personId, role: position === 'manager' ? 'manager' : 'staff', supervisionTeam: team, supervisionPosition: position, hasPermission: (permission) => position === 'manager' && ['supervision.view', 'supervision.manage'].includes(permission) })
const admin = () => ({ _id: personId, role: 'admin', isPrimaryAdmin: true, hasPermission: () => true })
const query = (team = 'academic') => ({ user: actor(), query: { team, from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' }, body: {}, ip: '127.0.0.1' })

beforeEach(() => jest.clearAllMocks())

test('manager cannot read coverage of the other team', async () => {
  const res = response()
  await ctrl.coverage(query('administrative'), res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Session.find).not.toHaveBeenCalled()
})

test('coverage derives owner and active shift from the real session time', async () => {
  Assignment.distinct.mockResolvedValue([teacher])
  const scheduledAt = new Date('2026-10-01T10:00:00Z')
  Session.find.mockReturnValue({ select: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ populate: () => ({ populate: () => ({ lean: async () => [
    { _id: 'session1', teacherId: { _id: teacher, firstNameAr: 'أحمد' }, studentId: { _id: 'student1' }, scheduledAt },
  ] }) }) }) }) }) }) })
  Session.countDocuments.mockResolvedValue(1)
  Assignment.find.mockReturnValue({ select: () => ({ populate: () => ({ lean: async () => [{ teacherId: teacher, supervisorId: { _id: supervisor, isActive: true }, startsAt: new Date('2026-10-01T08:00:00Z'), endsAt: null }] }) }) })
  Shift.find.mockReturnValue({ select: () => ({ lean: async () => [{ startsAt: new Date('2026-10-01T09:00:00Z'), endsAt: new Date('2026-10-01T12:00:00Z'), members: [supervisor] }] }) })
  const res = response()
  await ctrl.coverage(query(), res, jest.fn())
  expect(res.json.mock.calls[0][0].data[0].coverage).toBe('covered')
  expect(res.json.mock.calls[0][0].data[0].supervisor._id).toBe(supervisor)
  expect(Session.find.mock.calls[0][0].teacherId.$in).toEqual([teacher])
})

test('manager cannot update shared settings', async () => {
  const req = query()
  req.body = { team: 'academic', notificationRecipients: [] }
  const res = response()
  await ctrl.updateSettings(req, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Settings.findOneAndUpdate).not.toHaveBeenCalled()
})

test('admin saves a bounded reporting policy for one team', async () => {
  const req = query()
  req.user = admin()
  req.body = { team: 'academic', notificationRecipients: ['manager', 'supervisor'], reportGraceMinutes: 120, escalateAfterMinutes: 30, priorityCategories: [] }
  Settings.findOneAndUpdate.mockResolvedValue({ _id: personId, ...req.body })
  const res = response()
  await ctrl.updateSettings(req, res, jest.fn())
  expect(Settings.findOneAndUpdate.mock.calls[0][0]).toEqual({ team: 'academic' })
  expect(res.json.mock.calls[0][0].success).toBe(true)
})

test('admin cannot disable a supervisor with future work', async () => {
  User.findById.mockReturnValue({ select: async () => ({ _id: supervisor, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor', isActive: true }) })
  hasFutureWork.mockResolvedValue(true)
  const req = { user: admin(), params: { id: supervisor }, body: { team: 'academic', position: 'supervisor', isActive: false }, ip: '127.0.0.1' }
  const res = response()
  await ctrl.updatePerson(req, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(409)
})

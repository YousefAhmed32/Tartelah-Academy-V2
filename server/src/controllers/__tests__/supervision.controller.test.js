jest.mock('../../models/User')
jest.mock('../../models/SupervisionShift')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionAssignmentLock')
jest.mock('../../models/ScheduleRule')
jest.mock('../../services/audit.service')
jest.mock('../../services/supervisionNotification.service')

const User = require('../../models/User')
const Shift = require('../../models/SupervisionShift')
const Assignment = require('../../models/SupervisionAssignment')
const Lock = require('../../models/SupervisionAssignmentLock')
const ctrl = require('../supervision.controller')

const teacherId = '507f1f77bcf86cd799439011'
const supervisorId = '507f1f77bcf86cd799439012'
const otherId = '507f1f77bcf86cd799439013'
const assignmentId = '507f1f77bcf86cd799439014'

function actor(team = 'academic', position = 'manager') {
  return { _id: otherId, role: position === 'manager' ? 'manager' : 'staff', supervisionTeam: team, supervisionPosition: position,
    permissions: position === 'manager' ? ['supervision.view', 'supervision.manage'] : ['supervision.view'],
    hasPermission(permission) { return this.permissions.includes(permission) } }
}
function response() { return { status: jest.fn().mockReturnThis(), json: jest.fn() } }
function request(body, user = actor()) { return { body, user, params: {}, query: {}, ip: '127.0.0.1' } }

beforeEach(() => { jest.clearAllMocks(); Lock.findOneAndUpdate.mockImplementation(async (_, update) => ({ token: update.$set.token })); Lock.deleteOne.mockResolvedValue({}) })

describe('V3-1 supervision scope and schedules', () => {
  test('an academic manager cannot read administrative assignments by team parameter', async () => {
    const req = request({}, actor('academic', 'manager'))
    req.query.team = 'administrative'
    const res = response()
    await ctrl.listAssignments(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
    expect(Assignment.find).not.toHaveBeenCalled()
  })

  test('an academic manager cannot create an administrative shift', async () => {
    const res = response()
    await ctrl.createShift(request({ team: 'administrative', name: 'صباحي' }), res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
    expect(Shift.create).not.toHaveBeenCalled()
  })

  test('overlapping shifts with multiple members are valid and separately recorded', async () => {
    User.countDocuments.mockResolvedValue(2)
    Shift.create.mockImplementation(async (data) => ({ _id: assignmentId, ...data }))
    const base = { team: 'academic', name: 'متابعة', startsAt: '2026-10-01T08:00:00Z', endsAt: '2026-10-01T12:00:00Z', members: [supervisorId, otherId] }
    const first = response()
    const second = response()
    await ctrl.createShift(request(base), first, jest.fn())
    await ctrl.createShift(request({ ...base, startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T14:00:00Z' }), second, jest.fn())
    expect(first.status).toHaveBeenCalledWith(201)
    expect(second.status).toHaveBeenCalledWith(201)
    expect(Shift.create).toHaveBeenCalledTimes(2)
    expect(Shift.create.mock.calls[0][0].members).toHaveLength(2)
  })

  test('one teacher cannot get a second overlapping primary academic supervisor', async () => {
    User.findById.mockImplementation((value) => ({ select: async () => value === teacherId ? { role: 'teacher', isActive: true } : { supervisionTeam: 'academic', supervisionPosition: 'supervisor', isActive: true } }))
    Assignment.exists.mockResolvedValue({ _id: assignmentId })
    const res = response()
    await ctrl.createAssignment(request({ team: 'academic', teacherId, supervisorId, startsAt: '2026-10-01T08:00:00Z', primary: true }), res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(409)
    expect(Assignment.create).not.toHaveBeenCalled()
    expect(Lock.deleteOne).toHaveBeenCalled()
  })

  test('a supervisor cannot replace an assignment even with a forged manage flag', async () => {
    Assignment.findById.mockResolvedValue({ _id: assignmentId, team: 'academic' })
    const user = actor('academic', 'supervisor')
    user.permissions.push('supervision.manage')
    const req = request({ supervisorId }, user)
    req.params.id = assignmentId
    const res = response()
    await ctrl.replaceAssignment(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
    expect(User.findById).not.toHaveBeenCalled()
  })

  test('replacing a future assignment closes the old interval and preserves its record', async () => {
    const at = new Date(Date.now() + 86400000)
    const old = { _id: assignmentId, team: 'academic', teacherId, supervisorId, primary: true,
      startsAt: new Date(at.getTime() - 3600000), endsAt: null, save: jest.fn().mockResolvedValue(true) }
    Assignment.findById.mockResolvedValue(old)
    Assignment.exists.mockResolvedValue(null)
    Assignment.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439015' })
    User.findById.mockReturnValue({ select: async () => ({ _id: otherId, supervisionTeam: 'academic', supervisionPosition: 'supervisor', isActive: true }) })
    const req = request({ supervisorId: otherId, effectiveAt: at.toISOString(), reason: 'تبديل الشيفت' })
    req.params.id = assignmentId
    const res = response()
    await ctrl.replaceAssignment(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(old.endsAt).toEqual(at)
    expect(old.replacedBy).toBe('507f1f77bcf86cd799439015')
    expect(Assignment.create.mock.calls[0][0].startsAt).toEqual(at)
    expect(Lock.deleteOne).toHaveBeenCalled()
  })

  test('a concurrent primary assignment change returns a conflict', async () => {
    User.findById.mockImplementation((value) => ({ select: async () => value === teacherId ? { role: 'teacher', isActive: true } : { supervisionTeam: 'academic', supervisionPosition: 'supervisor', isActive: true } }))
    Lock.findOneAndUpdate.mockRejectedValue({ code: 11000 })
    const res = response()
    await ctrl.createAssignment(request({ team: 'academic', teacherId, supervisorId, startsAt: '2026-10-01T08:00:00Z' }), res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(409)
    expect(Assignment.create).not.toHaveBeenCalled()
  })
})

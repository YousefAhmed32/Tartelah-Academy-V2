// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) for the
// teacher-owned availability endpoint backing the redesigned "propose
// alternative time" picker — the ownership/IDOR guard is the highest-risk
// part of this controller (see teacherAssignment.controller.js's header
// comment).
jest.mock('../../models/AssignmentRequest')
jest.mock('../../services/availability.service')

const AssignmentRequest = require('../../models/AssignmentRequest')
const availabilityService = require('../../services/availability.service')
const ctrl = require('../teacherAssignment.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}
function jsonOf(res) { return res.json.mock.calls[0][0] }

beforeEach(() => {
  jest.resetAllMocks()
})

describe('getMyAssignmentRequestAvailability', () => {
  const baseDoc = {
    _id: 'req1', teacherId: 't1', status: 'pending_teacher_approval',
    lessonDurationMinutes: 60, schedule: { days: [{ dayOfWeek: 2, time: '17:00' }], timezone: null },
  }

  test('scopes the lookup to the authenticated teacher — another teacher\'s request 404s, never leaks availability', async () => {
    // findOne({ _id, teacherId: req.user._id }) naturally returns null when
    // the request belongs to someone else — the exact same ownership
    // pattern as getMyAssignmentRequest.
    AssignmentRequest.findOne.mockResolvedValue(null)
    const req = { params: { id: 'req1' }, user: { _id: 't2' } }
    const res = mockRes()

    await ctrl.getMyAssignmentRequestAvailability(req, res, jest.fn())

    expect(AssignmentRequest.findOne).toHaveBeenCalledWith({ _id: 'req1', teacherId: 't2' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(availabilityService.getWeeklyAvailability).not.toHaveBeenCalled()
  })

  test('returns weekly availability + suggestions for the owning teacher\'s own pending request', async () => {
    AssignmentRequest.findOne.mockResolvedValue(baseDoc)
    availabilityService.getWeeklyAvailability.mockResolvedValue({ timezone: 'Africa/Cairo', days: [] })
    availabilityService.suggestAlternativeSlots.mockResolvedValue([{ dayOfWeek: 3, time: '18:00' }])
    const req = { params: { id: 'req1' }, user: { _id: 't1' } }
    const res = mockRes()

    await ctrl.getMyAssignmentRequestAvailability(req, res, jest.fn())

    expect(availabilityService.getWeeklyAvailability).toHaveBeenCalledWith(expect.objectContaining({
      teacherId: 't1', durationMinutes: 60, excludeAssignmentRequestId: 'req1',
    }))
    expect(jsonOf(res).data.suggestions).toEqual([{ dayOfWeek: 3, time: '18:00' }])
  })

  test('rejects querying availability for a request that is no longer pending', async () => {
    AssignmentRequest.findOne.mockResolvedValue({ ...baseDoc, status: 'completed' })
    const req = { params: { id: 'req1' }, user: { _id: 't1' } }
    const res = mockRes()

    await ctrl.getMyAssignmentRequestAvailability(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(availabilityService.getWeeklyAvailability).not.toHaveBeenCalled()
  })
})

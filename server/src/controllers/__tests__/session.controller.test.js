jest.mock('../../models/Session')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')

const Session = require('../../models/Session')
const ctrl = require('../session.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}
function jsonOf(res) { return res.json.mock.calls[0][0] }

// Real (unmocked) attendancePolicy.js is exactly what's under test here —
// startSession must reject a check-in more than PRE_SESSION_ACCESS_MINUTES
// (60) before the scheduled start, on the BACKEND, not just hide the
// button on the frontend. See docs/SESSION_LIFECYCLE_GUIDE_AR.md §3.
describe('session.controller.startSession — check-in window enforcement', () => {
  const teacherId = 'teacher1'
  const teacher = { _id: teacherId, role: 'teacher' }
  const admin = { _id: 'admin1', role: 'admin' }

  function buildSession({ scheduledAt, durationMinutes = 60, status = 'scheduled' }) {
    return {
      _id: 'session1',
      teacherId,
      status,
      scheduledAt,
      durationMinutes,
      save: jest.fn().mockResolvedValue(true),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('rejects a teacher check-in far in the future with a 400 and no state change', async () => {
    const farFuture = new Date(Date.now() + 5 * 60 * 60 * 1000) // 5 hours from now
    const session = buildSession({ scheduledAt: farFuture })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: teacher }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(jsonOf(res).success).toBe(false)
    expect(jsonOf(res).earliestCheckInAt).toBeInstanceOf(Date)
    expect(session.status).toBe('scheduled') // never flipped to 'ongoing'
    expect(session.save).not.toHaveBeenCalled()
  })

  test('allows check-in once inside the 60-minute pre-session window', async () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    const session = buildSession({ scheduledAt: soon })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: teacher }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(session.status).toBe('ongoing')
    expect(session.save).toHaveBeenCalled()
    expect(jsonOf(res).success).toBe(true)
  })

  test('allows a scheduled-time-passed (already actionable) check-in', async () => {
    const past = new Date(Date.now() - 10 * 60 * 1000)
    const session = buildSession({ scheduledAt: past })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: teacher }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(session.status).toBe('ongoing')
    expect(jsonOf(res).success).toBe(true)
  })

  test('an admin is exempt from the pre-session window (legitimate correction path)', async () => {
    const farFuture = new Date(Date.now() + 5 * 60 * 60 * 1000)
    const session = buildSession({ scheduledAt: farFuture })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: admin }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(session.status).toBe('ongoing')
    expect(jsonOf(res).success).toBe(true)
  })
})

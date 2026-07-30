// This repo has no DB test infrastructure — see
// controllers/__tests__/course.controller.test.js for the established
// rationale. Mocks Session and verifies the exact overlap-query shape and
// the conflict/no-conflict decision, since the real double-booking
// guarantee ultimately comes from this query running against a live
// MongoDB (documented, not simulated, same boundary as scheduleDedupe.test.js).

jest.mock('../../models/Session')
const Session = require('../../models/Session')
const { assertNoConflict, BookingConflictError } = require('../booking.service')

function mockFindOne(result) {
  Session.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(result) })
}

beforeEach(() => jest.clearAllMocks())

describe('booking.service.assertNoConflict', () => {
  test('resolves silently when no overlapping session exists', async () => {
    mockFindOne(null)
    await expect(assertNoConflict({ teacherId: 't1', studentId: 's1', scheduledAt: '2026-08-01T18:00:00Z', durationMinutes: 60 }))
      .resolves.toBeUndefined()
  })

  test('throws BookingConflictError with the clashing session id when an overlap is found', async () => {
    mockFindOne({ _id: 'conflict1' })
    await expect(assertNoConflict({ teacherId: 't1', studentId: 's1', scheduledAt: '2026-08-01T18:00:00Z', durationMinutes: 60 }))
      .rejects.toThrow(BookingConflictError)
    try {
      await assertNoConflict({ teacherId: 't1', studentId: 's1', scheduledAt: '2026-08-01T18:00:00Z', durationMinutes: 60 })
    } catch (err) {
      expect(err.statusCode).toBe(409)
      expect(err.conflictingSessionId).toBe('conflict1')
    }
  })

  test('checks both the teacher and the student for an overlap ($or)', async () => {
    mockFindOne(null)
    await assertNoConflict({ teacherId: 't1', studentId: 's1', scheduledAt: '2026-08-01T18:00:00Z', durationMinutes: 60 })
    const filter = Session.findOne.mock.calls[0][0]
    expect(filter.$or).toEqual([{ teacherId: 't1' }, { studentId: 's1' }])
    expect(filter.status.$nin).toContain('cancelled')
  })

  test('excludes the session being rescheduled from its own conflict check', async () => {
    mockFindOne(null)
    await assertNoConflict({ teacherId: 't1', studentId: 's1', scheduledAt: '2026-08-01T18:00:00Z', durationMinutes: 60, excludeSessionId: 'sess1' })
    const filter = Session.findOne.mock.calls[0][0]
    expect(filter._id).toEqual({ $ne: 'sess1' })
  })
})

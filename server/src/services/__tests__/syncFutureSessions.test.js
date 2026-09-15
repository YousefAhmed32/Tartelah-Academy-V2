jest.mock('../../models/Session')
const Session = require('../../models/Session')
const scheduleService = require('../schedule.service')

describe('scheduleService.syncFutureSessionsForRule', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns updatedCount 0 if rule is undefined or has no _id', async () => {
    const res = await scheduleService.syncFutureSessionsForRule(null)
    expect(res).toEqual({ updatedCount: 0 })
    expect(Session.find).not.toHaveBeenCalled()
  })

  test('updates scheduledAt when rule timeOfDay changes from 18:00 to 21:00', async () => {
    const mockSession = {
      _id: 'session-1',
      seriesId: 'rule-123',
      status: 'scheduled',
      // Originally scheduled at 2026-09-14 18:00 (15:00 UTC for Asia/Riyadh +3)
      scheduledAt: new Date('2026-09-14T15:00:00.000Z'),
      durationMinutes: 60,
      meetingLink: 'https://zoom.us/old',
      isException: false,
      save: jest.fn().mockResolvedValue(true),
    }

    Session.find.mockResolvedValue([mockSession])

    const rule = {
      _id: 'rule-123',
      timeOfDay: '21:00',
      durationMinutes: 60,
      meetingLink: 'https://zoom.us/new',
      timezone: 'Asia/Riyadh',
    }

    const res = await scheduleService.syncFutureSessionsForRule(rule)

    expect(Session.find).toHaveBeenCalledWith(
      expect.objectContaining({
        seriesId: 'rule-123',
        status: 'scheduled',
      })
    )

    // 21:00 in Asia/Riyadh (UTC+3) is 18:00:00 UTC
    expect(mockSession.scheduledAt.toISOString()).toBe('2026-09-14T18:00:00.000Z')
    expect(mockSession.meetingLink).toBe('https://zoom.us/new')
    expect(mockSession.save).toHaveBeenCalledTimes(1)
    expect(res.updatedCount).toBe(1)
  })

  test('preserves custom scheduledAt for session where isException is true', async () => {
    const mockExceptionSession = {
      _id: 'session-exception',
      seriesId: 'rule-123',
      status: 'scheduled',
      scheduledAt: new Date('2026-09-14T10:00:00.000Z'),
      durationMinutes: 60,
      meetingLink: 'https://zoom.us/old',
      isException: true,
      save: jest.fn().mockResolvedValue(true),
    }

    Session.find.mockResolvedValue([mockExceptionSession])

    const rule = {
      _id: 'rule-123',
      timeOfDay: '21:00',
      timezone: 'Asia/Riyadh',
    }

    const res = await scheduleService.syncFutureSessionsForRule(rule)

    // Time is NOT modified because isException is true
    expect(mockExceptionSession.scheduledAt.toISOString()).toBe('2026-09-14T10:00:00.000Z')
    expect(mockExceptionSession.save).not.toHaveBeenCalled()
    expect(res.updatedCount).toBe(0)
  })
})

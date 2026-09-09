const { POLICY, classifyCheckIn, getSessionWindow } = require('../attendancePolicy')

describe('getSessionWindow', () => {
  const scheduledAt = new Date('2026-09-08T12:00:00.000Z')
  const durationMinutes = 60

  test('phase is "upcoming" before the check-in window opens (> PRE_SESSION_ACCESS_MINUTES before start)', () => {
    const now = new Date(scheduledAt.getTime() - (POLICY.PRE_SESSION_ACCESS_MINUTES + 1) * 60000)
    const w = getSessionWindow(scheduledAt, durationMinutes, now)
    expect(w.phase).toBe('upcoming')
    expect(w.isActionable).toBe(false)
  })

  test('phase flips to "pre_session" the instant the check-in window opens', () => {
    const now = new Date(scheduledAt.getTime() - POLICY.PRE_SESSION_ACCESS_MINUTES * 60000)
    const w = getSessionWindow(scheduledAt, durationMinutes, now)
    expect(w.phase).toBe('pre_session')
    expect(w.isActionable).toBe(true)
  })

  test('phase is "in_progress" during the scheduled session', () => {
    const now = new Date(scheduledAt.getTime() + 30 * 60000)
    expect(getSessionWindow(scheduledAt, durationMinutes, now).phase).toBe('in_progress')
  })

  test('phase moves through grace_period -> extended_completion -> overdue after the scheduled end', () => {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60000)
    expect(getSessionWindow(scheduledAt, durationMinutes, new Date(end.getTime() + 10 * 60000)).phase).toBe('grace_period')
    expect(getSessionWindow(scheduledAt, durationMinutes, new Date(end.getTime() + POLICY.POST_SESSION_GRACE_MINUTES * 60000 + 10 * 60000)).phase).toBe('extended_completion')
    expect(getSessionWindow(scheduledAt, durationMinutes, new Date(end.getTime() + POLICY.POST_SESSION_GRACE_MINUTES * 60000 + POLICY.EXTENDED_COMPLETION_MINUTES * 60000 + 10 * 60000)).phase).toBe('overdue')
  })

  test('preSessionOpensAt is exactly PRE_SESSION_ACCESS_MINUTES before scheduledStart', () => {
    const w = getSessionWindow(scheduledAt, durationMinutes)
    expect(w.preSessionOpensAt.getTime()).toBe(scheduledAt.getTime() - POLICY.PRE_SESSION_ACCESS_MINUTES * 60000)
  })
})

describe('classifyCheckIn', () => {
  const scheduledAt = new Date('2026-09-08T12:00:00.000Z')

  test('on_time within the tolerance window', () => {
    const result = classifyCheckIn(scheduledAt, new Date(scheduledAt.getTime() + POLICY.LATE_TOLERANCE_MINUTES * 60000))
    expect(result.status).toBe('on_time')
  })

  test('late beyond the tolerance window, with the real minutes-late count', () => {
    const result = classifyCheckIn(scheduledAt, new Date(scheduledAt.getTime() + 20 * 60000))
    expect(result.status).toBe('late')
    expect(result.lateMinutes).toBe(20)
  })

  test('a check-in before the scheduled time is never negative-late', () => {
    const result = classifyCheckIn(scheduledAt, new Date(scheduledAt.getTime() - 10 * 60000))
    expect(result.status).toBe('on_time')
    expect(result.lateMinutes).toBe(0)
  })
})

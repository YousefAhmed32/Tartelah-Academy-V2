const {
  academyDateKey, academyDateKeyBounds, academyDayBounds, academyMonthBounds,
  formatAcademyDateTimeAr, parseAcademyDateTime,
} = require('../academyDateTime')

describe('academyDateTime', () => {
  test('interprets a bare datetime-local value in academy time', () => {
    const parsed = parseAcademyDateTime('2026-09-17T09:00', 'Africa/Cairo')
    expect(parsed.toISOString()).toBe('2026-09-17T06:00:00.000Z')
  })

  test('does not shift an ISO value that already contains an offset', () => {
    const parsed = parseAcademyDateTime('2026-09-17T06:00:00.000Z', 'Africa/Cairo')
    expect(parsed.toISOString()).toBe('2026-09-17T06:00:00.000Z')
  })

  test('formats and groups UTC instants in academy time', () => {
    expect(academyDateKey('2026-09-16T22:30:00.000Z', 'Africa/Cairo')).toBe('2026-09-17')
    expect(formatAcademyDateTimeAr('2026-09-17T06:00:00.000Z', 'Africa/Cairo')).toContain('09:00')
  })

  test('builds month boundaries in the configured timezone', () => {
    const { start, end } = academyMonthBounds(2026, 9, 'Africa/Cairo')
    expect(start.toISOString()).toBe('2026-08-31T21:00:00.000Z')
    expect(end.toISOString()).toBe('2026-09-30T20:59:59.999Z')
  })

  test('builds day boundaries in academy time even when the server timezone differs', () => {
    const { start, end } = academyDayBounds('2026-09-17T10:00:00.000Z', 'Africa/Cairo')
    expect(start.toISOString()).toBe('2026-09-16T21:00:00.000Z')
    expect(end.toISOString()).toBe('2026-09-17T21:00:00.000Z')
  })

  test('builds filter boundaries from a calendar date in academy time', () => {
    const { start, end } = academyDateKeyBounds('2026-09-17', 'Africa/Cairo')
    expect(start.toISOString()).toBe('2026-09-16T21:00:00.000Z')
    expect(end.toISOString()).toBe('2026-09-17T21:00:00.000Z')
    expect(academyDateKeyBounds('not-a-date', 'Africa/Cairo')).toBeNull()
    expect(academyDateKeyBounds('2026-02-31', 'Africa/Cairo')).toBeNull()
  })
})

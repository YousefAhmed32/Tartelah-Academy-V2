const { validateWorkingHoursDays, buildDefaultWorkingHours, isValidTimeString } = require('../workingHours')

describe('isValidTimeString', () => {
  test.each(['00:00', '09:30', '23:59'])('accepts %s', (t) => expect(isValidTimeString(t)).toBe(true))
  test.each(['24:00', '9:30', '23:60', 'abc', '', null, undefined])('rejects %p', (t) => expect(isValidTimeString(t)).toBe(false))
})

describe('buildDefaultWorkingHours', () => {
  test('returns all 7 days, all unavailable, no periods', () => {
    const days = buildDefaultWorkingHours()
    expect(days).toHaveLength(7)
    expect(days.every((d) => d.mode === 'unavailable' && d.periods.length === 0)).toBe(true)
    expect(days.map((d) => d.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('validateWorkingHoursDays', () => {
  test('accepts the default (all unavailable) structure', () => {
    expect(validateWorkingHoursDays(buildDefaultWorkingHours())).toBeNull()
  })

  test('accepts a full_day day with no periods', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'full_day'
    expect(validateWorkingHoursDays(days)).toBeNull()
  })

  test('accepts a single custom period', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = [{ start: '10:00', end: '18:00' }]
    expect(validateWorkingHoursDays(days)).toBeNull()
  })

  test('accepts multiple non-overlapping custom periods (implicit break between them)', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = [{ start: '10:00', end: '14:00' }, { start: '18:00', end: '22:00' }]
    expect(validateWorkingHoursDays(days)).toBeNull()
  })

  test('rejects a missing days array', () => {
    expect(validateWorkingHoursDays(null)).not.toBeNull()
    expect(validateWorkingHoursDays([])).not.toBeNull()
  })

  test('rejects a duplicate dayOfWeek', () => {
    const days = buildDefaultWorkingHours()
    days.push({ dayOfWeek: 0, mode: 'unavailable', periods: [] })
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects an out-of-range dayOfWeek', () => {
    const days = buildDefaultWorkingHours()
    days[0].dayOfWeek = 7
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects an invalid mode', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'sometimes'
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects periods present on a non-custom day', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'full_day'
    days[0].periods = [{ start: '10:00', end: '12:00' }]
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects a custom day with zero periods', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = []
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects a period where start >= end', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = [{ start: '14:00', end: '10:00' }]
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects a malformed time string', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = [{ start: '10am', end: '18:00' }]
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects overlapping periods on the same day', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = [{ start: '10:00', end: '14:00' }, { start: '13:00', end: '16:00' }]
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('rejects periods that exactly overlap regardless of input order', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = [{ start: '18:00', end: '22:00' }, { start: '10:00', end: '19:00' }]
    expect(validateWorkingHoursDays(days)).not.toBeNull()
  })

  test('accepts back-to-back periods that touch but do not overlap', () => {
    const days = buildDefaultWorkingHours()
    days[0].mode = 'custom'
    days[0].periods = [{ start: '10:00', end: '12:00' }, { start: '12:00', end: '14:00' }]
    expect(validateWorkingHoursDays(days)).toBeNull()
  })
})

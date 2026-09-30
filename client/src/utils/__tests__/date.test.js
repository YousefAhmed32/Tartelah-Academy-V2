import { afterEach, describe, expect, test } from 'vitest'
import {
  academyDateKey, academyDayRange, academyMonthDateRange, formatDateAr, formatTimeAr, getDayNameAr,
  setAcademyTimezone, shiftDateKey, toAcademyDateTimeLocal,
} from '../date.js'

afterEach(() => setAcademyTimezone('Africa/Cairo'))

describe('academy timezone date formatting', () => {
  test('renders a UTC session instant using academy time, not device time', () => {
    setAcademyTimezone('Africa/Cairo')
    expect(formatTimeAr('2026-09-17T06:00:00.000Z')).toContain('9:00')
    expect(toAcademyDateTimeLocal('2026-09-17T06:00:00.000Z')).toBe('2026-09-17T09:00')
  })

  test('follows the configured academy timezone', () => {
    setAcademyTimezone('Asia/Dubai')
    expect(formatTimeAr('2026-09-17T06:00:00.000Z')).toContain('10:00')
  })

  test('uses academy calendar day for grouping near UTC midnight', () => {
    setAcademyTimezone('Africa/Cairo')
    expect(academyDateKey('2026-09-16T22:30:00.000Z')).toBe('2026-09-17')
    expect(formatDateAr('2026-09-16T22:30:00.000Z')).toContain('17')
    expect(getDayNameAr('2026-09-16T22:30:00.000Z')).toBeTruthy()
  })

  test('builds academy calendar ranges without browser timezone arithmetic', () => {
    expect(shiftDateKey('2026-09-17', 7)).toBe('2026-09-24')
    expect(academyMonthDateRange('2026-09-17T06:00:00.000Z')).toEqual({
      start: '2026-09-01', end: '2026-09-30',
    })
  })

  test('uses exact academy midnight even when daylight saving changes the day length', () => {
    expect(academyDayRange('2026-04-23')).toEqual({ from: '2026-04-22T22:00:00.000Z', to: '2026-04-23T21:00:00.000Z' })
    expect(academyDayRange('2026-10-29')).toEqual({ from: '2026-10-28T21:00:00.000Z', to: '2026-10-29T22:00:00.000Z' })
    expect(academyDayRange('2026-02-30')).toBeNull()
  })
})

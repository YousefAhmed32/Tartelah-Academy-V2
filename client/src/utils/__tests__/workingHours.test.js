// Phase 2 Part 2c continuation improvement — locked teacher-context card
// shown inside the "add student" flow when reached from the onboarding
// wizard's success page. Only the new helper is covered here; the rest of
// this module's working-hours validation logic is unchanged.
import { describe, test, expect } from 'vitest'
import { summarizeWorkingHoursDays } from '../workingHours.js'

describe('summarizeWorkingHoursDays', () => {
  test('no data at all — not yet configured', () => {
    expect(summarizeWorkingHoursDays(undefined)).toBe('لم تُحدد أوقات العمل بعد')
    expect(summarizeWorkingHoursDays([])).toBe('لم تُحدد أوقات العمل بعد')
  })

  test('every day unavailable', () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, mode: 'unavailable', periods: [] }))
    expect(summarizeWorkingHoursDays(days)).toBe('غير متاح في أي يوم حاليًا')
  })

  test('counts full_day and custom days as available, singular vs plural wording', () => {
    const oneDay = [{ dayOfWeek: 0, mode: 'full_day', periods: [] }, { dayOfWeek: 1, mode: 'unavailable', periods: [] }]
    expect(summarizeWorkingHoursDays(oneDay)).toBe('متاح 1 يوم أسبوعيًا')

    const fiveDays = [0, 1, 2, 3, 4].map((dayOfWeek) => ({ dayOfWeek, mode: 'custom', periods: [{ start: '10:00', end: '14:00' }] }))
      .concat([5, 6].map((dayOfWeek) => ({ dayOfWeek, mode: 'unavailable', periods: [] })))
    expect(summarizeWorkingHoursDays(fiveDays)).toBe('متاح 5 أيام أسبوعيًا')
  })
})

import { describe, test, expect } from 'vitest'
import {
  formatTimeArabic12, formatTimeArabic12Strict, addMinutesToTime, describeAvailability, generateTimeSlots,
  groupSlotsByPeriod, findNearestSlot, findSameTimeOtherDay, findCommonTime,
  buildSuggestions, computeUpcomingOccurrences, scheduleSummaryLabel,
  validateScheduleDates, dayLabel, deriveScheduleDays, hydrateScheduleSelection,
  validateScheduleForSubmit,
  buildSlotStatusMap, conflictLabel, isTemporaryHold,
  buildAssignmentMessagePreview, formatScheduleDays, formatScheduleTimes,
} from '../assignmentSchedule.js'

describe('formatTimeArabic12', () => {
  test('formats morning/afternoon correctly with ص/م', () => {
    expect(formatTimeArabic12('06:00')).toBe('6:00 ص')
    expect(formatTimeArabic12('18:00')).toBe('6:00 م')
    expect(formatTimeArabic12('00:30')).toBe('12:30 ص') // 30 min after midnight, not midnight itself
  })
  test('handles noon and the 24:00 end-of-day sentinel without a bogus "12:00 م" for midnight', () => {
    expect(formatTimeArabic12('12:00')).toBe('12:00 م')
    expect(formatTimeArabic12('24:00')).toBe('منتصف الليل')
  })
  test('never renders a raw technical 24-hour string', () => {
    expect(formatTimeArabic12('14:30')).not.toContain('14:30')
  })
})

describe('formatTimeArabic12Strict', () => {
  test('always numeric — never substitutes "منتصف الليل" for 00:00/24:00', () => {
    expect(formatTimeArabic12Strict('00:00')).toBe('12:00 ص')
    expect(formatTimeArabic12Strict('24:00')).toBe('12:00 ص')
    expect(formatTimeArabic12Strict('00:30')).toBe('12:30 ص')
  })
  test('a slot range built from this formatter never mixes a word with a number', () => {
    // The exact bug the UX brief flagged: a range where the start reads as a
    // word ("منتصف الليل") and the end reads as a number ("12:30 ص") — the
    // strict formatter must keep both ends numeric and consistent.
    const start = formatTimeArabic12Strict('00:00')
    const end = formatTimeArabic12Strict(addMinutesToTime('00:00', 30))
    expect(start).toBe('12:00 ص')
    expect(end).toBe('12:30 ص')
    expect(`${start} – ${end}`).toBe('12:00 ص – 12:30 ص')
  })
  test('matches formatTimeArabic12 for every other time', () => {
    expect(formatTimeArabic12Strict('06:00')).toBe(formatTimeArabic12('06:00'))
    expect(formatTimeArabic12Strict('18:00')).toBe(formatTimeArabic12('18:00'))
    expect(formatTimeArabic12Strict('12:00')).toBe(formatTimeArabic12('12:00'))
  })
})

describe('addMinutesToTime', () => {
  test('computes the end time from a start time + duration', () => {
    expect(addMinutesToTime('18:00', 30)).toBe('18:30')
    expect(addMinutesToTime('23:45', 30)).toBe('00:15') // wraps past midnight safely
  })
})

describe('describeAvailability', () => {
  test('never shows the raw "00:00-24:00" technical form for a full day', () => {
    const result = describeAvailability([{ start: '00:00', end: '24:00' }], 30)
    expect(result.text).toBe('متاح طوال اليوم')
    expect(result.text).not.toMatch(/00:00|24:00/)
  })
  test('describes a partial day in friendly Arabic', () => {
    const result = describeAvailability([{ start: '10:00', end: '14:00' }], 30)
    expect(result.text).toContain('10:00 ص')
    expect(result.text).toContain('2:00 م')
  })
  test('shows a clear empty state when nothing fits', () => {
    expect(describeAvailability([], 30).kind).toBe('none')
  })
  test('distinguishes loading (undefined) from genuinely empty ([])', () => {
    expect(describeAvailability(undefined, 30).kind).toBe('loading')
    expect(describeAvailability([], 30).kind).toBe('none')
  })
})

describe('generateTimeSlots', () => {
  test('only returns starts where the FULL duration still fits before the window ends', () => {
    const slots = generateTimeSlots([{ start: '10:00', end: '10:40' }], 30, 15)
    expect(slots).toEqual(['10:00'])
  })
  test('steps through a wider window at the given granularity', () => {
    const slots = generateTimeSlots([{ start: '10:00', end: '11:00' }], 30, 15)
    expect(slots).toEqual(['10:00', '10:15', '10:30'])
  })
  test('an empty window list yields no slots', () => {
    expect(generateTimeSlots([], 30)).toEqual([])
  })
})

describe('buildSlotStatusMap', () => {
  test('marks real free starts available and occupied starts busy', () => {
    const result = buildSlotStatusMap(
      [{ start: '10:00', end: '13:00' }],
      [{ start: '10:00', end: '11:00' }, { start: '12:00', end: '13:00' }],
      60,
      60,
    )
    expect(result).toEqual([
      { time: '10:00', status: 'available' },
      { time: '11:00', status: 'busy' },
      { time: '12:00', status: 'available' },
    ])
  })

  // Phase 2 change request #1 — a temporary hold (another pending request
  // or a teacher's proposed alternative) must render as a distinct third
  // state, never indistinguishable from a real confirmed booking.
  test('classifies a busy slot as "reserved" (temporary hold) vs "busy" (confirmed) using kind-tagged busyWindows', () => {
    const result = buildSlotStatusMap(
      [{ start: '10:00', end: '13:00' }],
      [{ start: '12:00', end: '13:00' }], // only 12:00 is genuinely free
      60, 60,
      [
        { start: '10:00', end: '11:00', kind: 'confirmed' },
        { start: '11:00', end: '12:00', kind: 'reserved' },
      ],
    )
    expect(result).toEqual([
      { time: '10:00', status: 'busy' },
      { time: '11:00', status: 'reserved' },
      { time: '12:00', status: 'available' },
    ])
  })

  test('omitting busyWindows preserves the original two-state (available/busy) behavior', () => {
    const result = buildSlotStatusMap([{ start: '10:00', end: '12:00' }], [{ start: '11:00', end: '12:00' }], 60, 60)
    expect(result).toEqual([{ time: '10:00', status: 'busy' }, { time: '11:00', status: 'available' }])
  })
})

describe('conflictLabel', () => {
  test('a confirmed-booking conflict shows the normal reason text', () => {
    const label = conflictLabel({ dayOfWeek: 1, time: '10:00', reason: 'teacher_conflict', kind: 'confirmed' })
    expect(label).toContain('محجوز لدى المعلم')
    expect(label).not.toContain('محجوز مؤقتًا')
  })
  test('a reserved (temporary-hold) conflict is explicitly labeled as such', () => {
    const label = conflictLabel({ dayOfWeek: 1, time: '10:00', reason: 'teacher_conflict', kind: 'reserved' })
    expect(label).toContain('محجوز مؤقتًا — بانتظار الموافقة')
  })
  test('a non-booking conflict reason (e.g. outside working hours) ignores kind entirely', () => {
    const label = conflictLabel({ dayOfWeek: 1, time: '10:00', reason: 'outside_working_hours', kind: 'reserved' })
    expect(label).toContain('خارج أوقات عمل المعلم')
  })
})

describe('isTemporaryHold', () => {
  test('true only for kind: "reserved"', () => {
    expect(isTemporaryHold({ kind: 'reserved' })).toBe(true)
    expect(isTemporaryHold({ kind: 'confirmed' })).toBe(false)
    expect(isTemporaryHold({})).toBe(false)
    expect(isTemporaryHold(undefined)).toBe(false)
  })
})

describe('groupSlotsByPeriod', () => {
  test('buckets into morning/afternoon/evening correctly', () => {
    const groups = groupSlotsByPeriod(['08:00', '13:00', '19:00'])
    expect(groups.morning).toEqual(['08:00'])
    expect(groups.afternoon).toEqual(['13:00'])
    expect(groups.evening).toEqual(['19:00'])
  })
})

const freeWindowsByDay = {
  0: [{ start: '16:00', end: '18:00' }], // Sunday
  1: [],
  2: [{ start: '16:00', end: '18:00' }], // Tuesday — same window as Sunday
  3: [],
  4: [{ start: '09:00', end: '10:00' }], // Thursday
  5: [],
  6: [],
}

describe('findNearestSlot / findSameTimeOtherDay / findCommonTime', () => {
  test('findNearestSlot returns the earliest fitting day, skipping excluded days', () => {
    expect(findNearestSlot(freeWindowsByDay, 30, [])).toEqual({ dayOfWeek: 0, time: '16:00' })
    expect(findNearestSlot(freeWindowsByDay, 30, [0])).toEqual({ dayOfWeek: 2, time: '16:00' })
  })
  test('findSameTimeOtherDay finds another day where the identical time is free', () => {
    expect(findSameTimeOtherDay(freeWindowsByDay, '16:00', 30, [0])).toEqual({ dayOfWeek: 2, time: '16:00' })
    expect(findSameTimeOtherDay(freeWindowsByDay, '09:00', 30, [4])).toBeNull()
  })
  test('findCommonTime finds a time free across every given day', () => {
    expect(findCommonTime(freeWindowsByDay, [0, 2], 30)).toBe('16:00')
    expect(findCommonTime(freeWindowsByDay, [0, 4], 30)).toBeNull() // no overlapping window
  })
})

describe('buildSuggestions', () => {
  test('suggests a real nearest slot derived from actual availability, not a fabricated value', () => {
    const suggestions = buildSuggestions({ days: [], freeWindowsByDay, durationMinutes: 30 })
    const nearest = suggestions.find((s) => s.key === 'nearest')
    expect(nearest.days).toEqual([{ dayOfWeek: 0, time: '16:00' }])
  })
  test('suggests the same time on another day once one day is already picked', () => {
    const suggestions = buildSuggestions({ days: [{ dayOfWeek: 0, time: '16:00' }], freeWindowsByDay, durationMinutes: 30 })
    const sameTime = suggestions.find((s) => s.key === 'same-time')
    expect(sameTime.days).toContainEqual({ dayOfWeek: 2, time: '16:00' })
  })
  test('returns no suggestions while availability is still loading (undefined)', () => {
    expect(buildSuggestions({ days: [], freeWindowsByDay: undefined, durationMinutes: 30 })).toEqual([])
  })
})

describe('computeUpcomingOccurrences — mirrors the backend recurrence engine', () => {
  test('weekly: only the selected weekdays recur, each on its own time', () => {
    const occ = computeUpcomingOccurrences({
      days: [{ dayOfWeek: 0, time: '18:00' }, { dayOfWeek: 2, time: '19:00' }],
      startDate: '2026-08-30', frequency: 'weekly', // a Sunday
    }, { windowDays: 14, maxCount: 10 })
    expect(occ.every((o) => [0, 2].includes(o.dayOfWeek))).toBe(true)
    expect(occ.find((o) => o.dayOfWeek === 0).time).toBe('18:00')
    expect(occ.find((o) => o.dayOfWeek === 2).time).toBe('19:00')
  })
  test('daily: every calendar day is included regardless of weekday', () => {
    const occ = computeUpcomingOccurrences({
      days: [{ dayOfWeek: 0, time: '18:00' }], startDate: '2026-08-30', frequency: 'daily',
    }, { windowDays: 7, maxCount: 20 })
    const distinctDows = new Set(occ.map((o) => o.dayOfWeek))
    expect(distinctDows.size).toBeGreaterThan(1)
  })
  test('monthly: only the same day-of-month as the start date recurs', () => {
    const occ = computeUpcomingOccurrences({
      days: [{ dayOfWeek: 0, time: '18:00' }], startDate: '2026-08-15', frequency: 'monthly',
    }, { windowDays: 65, maxCount: 5 })
    expect(occ.every((o) => o.date.getDate() === 15)).toBe(true)
  })
  test('biweekly: skips alternating weeks (only every-other Sunday, not every Sunday)', () => {
    const biweekly = computeUpcomingOccurrences({
      days: [{ dayOfWeek: 0, time: '18:00' }], startDate: '2026-08-30', frequency: 'biweekly',
    }, { windowDays: 28, maxCount: 10 })
    const weekly = computeUpcomingOccurrences({
      days: [{ dayOfWeek: 0, time: '18:00' }], startDate: '2026-08-30', frequency: 'weekly',
    }, { windowDays: 28, maxCount: 10 })
    expect(biweekly.length).toBeLessThan(weekly.length)
  })
  test('an end date stops generation, an absent end date does not', () => {
    const withEnd = computeUpcomingOccurrences({
      days: [{ dayOfWeek: 0, time: '18:00' }], startDate: '2026-08-30', endDate: '2026-09-05', frequency: 'weekly',
    }, { windowDays: 60, maxCount: 40 })
    const withoutEnd = computeUpcomingOccurrences({
      days: [{ dayOfWeek: 0, time: '18:00' }], startDate: '2026-08-30', frequency: 'weekly',
    }, { windowDays: 60, maxCount: 40 })
    expect(withEnd.length).toBeLessThan(withoutEnd.length)
  })
})

describe('scheduleSummaryLabel', () => {
  test('matches the exact format requested for the collapsed student-card header', () => {
    const label = scheduleSummaryLabel({
      enabled: true, frequency: 'weekly',
      selectedDayOfWeeks: [0, 2], dayTimes: { 0: '18:00', 2: '18:00' },
      lessonDurationMinutes: 30,
    })
    expect(label).toBe(`${dayLabel(0)} و${dayLabel(2)} • 6:00 م • 30 دقيقة • أسبوعيًا`)
  })
  test('returns null when no schedule is configured yet', () => {
    expect(scheduleSummaryLabel({ enabled: false, selectedDayOfWeeks: [] })).toBeNull()
  })
  test('daily/monthly summaries omit the day-name segment (every day / same day-of-month, not a weekday list)', () => {
    const daily = scheduleSummaryLabel({ enabled: true, frequency: 'daily', singleTime: '17:00', lessonDurationMinutes: 30 })
    expect(daily).toBe('5:00 م • 30 دقيقة • يوميًا')
  })
})

describe('deriveScheduleDays / hydrateScheduleSelection round-trip', () => {
  test('weekly: derives exactly the selected days, each with its own time', () => {
    const schedule = { frequency: 'weekly', selectedDayOfWeeks: [0, 4], dayTimes: { 0: '18:00', 4: '09:00' } }
    expect(deriveScheduleDays(schedule)).toEqual([{ dayOfWeek: 0, time: '18:00' }, { dayOfWeek: 4, time: '09:00' }])
  })
  test('daily: expands to all 7 days at the same time (so availability is checked against every real weekday)', () => {
    const days = deriveScheduleDays({ frequency: 'daily', singleTime: '10:00' })
    expect(days).toHaveLength(7)
    expect(days.every((d) => d.time === '10:00')).toBe(true)
  })
  test('monthly: a single entry on the start date\'s own weekday', () => {
    const days = deriveScheduleDays({ frequency: 'monthly', singleTime: '10:00', startDate: '2026-08-30' }) // a Sunday
    expect(days).toEqual([{ dayOfWeek: 0, time: '10:00' }])
  })
  test('hydrateScheduleSelection round-trips a weekly schedule back into UI selection state', () => {
    const original = { frequency: 'weekly', selectedDayOfWeeks: [1, 3], dayTimes: { 1: '16:00', 3: '17:00' } }
    const derived = deriveScheduleDays(original)
    const hydrated = hydrateScheduleSelection(derived, 'weekly')
    expect(hydrated.selectedDayOfWeeks.sort()).toEqual([1, 3])
    expect(hydrated.dayTimes).toEqual({ 1: '16:00', 3: '17:00' })
  })
})

describe('validateScheduleDates', () => {
  test('rejects a missing start date', () => {
    expect(validateScheduleDates({ startDate: '', endDate: '', noEndDate: false }).startError).toBeTruthy()
  })
  test('rejects an end date on/before the start date', () => {
    const { endError } = validateScheduleDates({ startDate: '2026-09-10', endDate: '2026-09-05', noEndDate: false })
    expect(endError).toBeTruthy()
  })
  test('accepts a valid end date after the start date', () => {
    const result = validateScheduleDates({ startDate: '2026-09-01', endDate: '2026-09-10', noEndDate: false })
    expect(result.startError).toBeNull()
    expect(result.endError).toBeNull()
  })
  test('"continues until cancelled" (noEndDate) needs no end date at all', () => {
    const result = validateScheduleDates({ startDate: '2026-09-01', endDate: '', noEndDate: true })
    expect(result.endError).toBeNull()
  })
})

describe('validateScheduleForSubmit', () => {
  const base = {
    enabled: true, specialization: 'tajweed', lessonDurationMinutes: 30, frequency: 'weekly',
    selectedDayOfWeeks: [0], dayTimes: { 0: '18:00' }, startDate: '2026-09-01', endDate: '', noEndDate: true,
  }
  test('a disabled schedule is always valid (nothing to submit)', () => {
    expect(validateScheduleForSubmit({ enabled: false }, 'existing')).toBeNull()
  })
  test('requires a specialization', () => {
    expect(validateScheduleForSubmit({ ...base, specialization: '' }, 'existing')).toBeTruthy()
  })
  test('requires at least one derived day', () => {
    expect(validateScheduleForSubmit({ ...base, selectedDayOfWeeks: [] }, 'existing')).toBeTruthy()
  })
  test('rejects an end date before the start date', () => {
    expect(validateScheduleForSubmit({ ...base, noEndDate: false, endDate: '2026-08-01' }, 'existing')).toBeTruthy()
  })
  test('requires an override reason only when immediateOverride is set for a new student', () => {
    expect(validateScheduleForSubmit({ ...base, immediateOverride: true, overrideReason: '' }, 'new')).toBeTruthy()
    expect(validateScheduleForSubmit({ ...base, immediateOverride: true, overrideReason: 'حالة عاجلة' }, 'new')).toBeNull()
  })
  test('a fully valid weekly schedule passes', () => {
    expect(validateScheduleForSubmit(base, 'existing')).toBeNull()
  })
  test('a fully valid daily/monthly schedule (no weekday selection needed) passes', () => {
    expect(validateScheduleForSubmit({ ...base, frequency: 'daily', singleTime: '10:00', selectedDayOfWeeks: [] }, 'existing')).toBeNull()
    expect(validateScheduleForSubmit({ ...base, frequency: 'monthly', singleTime: '10:00', selectedDayOfWeeks: [] }, 'existing')).toBeNull()
  })
})

describe('buildAssignmentMessagePreview', () => {
  test('formats schedule days and times correctly', () => {
    const days = [{ dayOfWeek: 0, time: '16:00' }, { dayOfWeek: 2, time: '18:00' }]
    expect(formatScheduleDays(days)).toBe('الأحد، الثلاثاء')
    expect(formatScheduleTimes(days)).toContain('الأحد')
  })

  test('builds gender-aware Arabic message preview for male student', () => {
    const msg = buildAssignmentMessagePreview({
      teacherName: 'أحمد محمود',
      studentName: 'عمر خالد',
      studentGender: 'male',
      studentAge: 12,
      curriculum: 'quran',
      scheduleDays: [{ dayOfWeek: 0, time: '16:00' }],
      scheduleTimes: [{ dayOfWeek: 0, time: '16:00' }],
      lessonDurationMinutes: 45,
      startDate: '2026-09-01',
    })
    expect(msg).toContain('أ. أحمد محمود')
    expect(msg).toContain('طالب جديد')
    expect(msg).toContain('بياناته كالتالي')
    expect(msg).toContain('عمر خالد')
    expect(msg).toContain('45 دقيقة')
    expect(msg).toContain('القرآن الكريم')
  })

  test('builds gender-aware Arabic message preview for female student', () => {
    const msg = buildAssignmentMessagePreview({
      teacherName: 'فاطمة الزهراء',
      studentName: 'مريم علي',
      studentGender: 'female',
      studentAge: 10,
      curriculum: 'tajweed',
      scheduleDays: [{ dayOfWeek: 1, time: '17:00' }],
      scheduleTimes: [{ dayOfWeek: 1, time: '17:00' }],
      lessonDurationMinutes: 60,
      startDate: '2026-09-01',
    })
    expect(msg).toContain('طالبة جديدة')
    expect(msg).toContain('بياناتها كالتالي')
    expect(msg).toContain('مريم علي')
    expect(msg).toContain('التجويد')
  })
})

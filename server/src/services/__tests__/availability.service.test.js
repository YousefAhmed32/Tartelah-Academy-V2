// Mocked-model tests (no DB test infra in this repo — see
// wallet.service.test.js for the established rationale) for the
// availability engine's core arithmetic: working-hours × existing bookings ×
// buffer → free windows, and the authoritative slot re-check.
jest.mock('../../models/TeacherWorkingHours')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/Session')
jest.mock('../../models/AssignmentRequest')
jest.mock('../academySettings.service')

const TeacherWorkingHours = require('../../models/TeacherWorkingHours')
const ScheduleRule = require('../../models/ScheduleRule')
const Session = require('../../models/Session')
const AssignmentRequest = require('../../models/AssignmentRequest')
const { fromZonedTime } = require('date-fns-tz')
const { getAcademySchedulingSettings } = require('../academySettings.service')
const { getWeeklyAvailability, checkAvailability, suggestAlternativeSlots } = require('../availability.service')

function chain(result) {
  return { select: () => ({ lean: () => Promise.resolve(result) }) }
}

beforeEach(() => {
  jest.resetAllMocks()
  getAcademySchedulingSettings.mockResolvedValue({ timezone: 'Africa/Cairo', lessonBufferMinutes: 0 })
  ScheduleRule.find.mockReturnValue(chain([]))
  Session.find.mockReturnValue(chain([]))
  AssignmentRequest.find.mockReturnValue(chain([]))
})

describe('getWeeklyAvailability', () => {
  test('a full-day working day with nothing booked is entirely free', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({
      lean: () => Promise.resolve({ timezone: null, days: [{ dayOfWeek: 0, mode: 'full_day', periods: [] }] }),
    })
    const result = await getWeeklyAvailability({ teacherId: 't1', durationMinutes: 60 })
    const sunday = result.days.find((d) => d.dayOfWeek === 0)
    expect(sunday.workingWindows).toEqual([{ start: '00:00', end: '24:00' }])
    expect(sunday.busyWindows).toEqual([])
    expect(sunday.freeWindows).toEqual([{ start: '00:00', end: '24:00' }])
  })

  test('an unavailable day has no free windows regardless of duration', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({
      lean: () => Promise.resolve({ timezone: null, days: [{ dayOfWeek: 1, mode: 'unavailable', periods: [] }] }),
    })
    const result = await getWeeklyAvailability({ teacherId: 't1', durationMinutes: 30 })
    expect(result.days.find((d) => d.dayOfWeek === 1).freeWindows).toEqual([])
  })

  test('an existing recurring ScheduleRule carves a hole out of a custom working period', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({
      lean: () => Promise.resolve({ timezone: null, days: [{ dayOfWeek: 2, mode: 'custom', periods: [{ start: '10:00', end: '14:00' }] }] }),
    })
    ScheduleRule.find.mockReturnValue(chain([{ daysOfWeek: [2], timeOfDay: '11:00', durationMinutes: 60 }]))
    const result = await getWeeklyAvailability({ teacherId: 't1', durationMinutes: 60 })
    const tuesday = result.days.find((d) => d.dayOfWeek === 2)
    // 10:00-14:00 minus 11:00-12:00 (busy) leaves 10:00-11:00 and 12:00-14:00
    expect(tuesday.workingWindows).toEqual([{ start: '10:00', end: '14:00' }])
    expect(tuesday.busyWindows).toEqual([{ start: '11:00', end: '12:00', kind: 'confirmed' }])
    expect(tuesday.freeWindows).toEqual([{ start: '10:00', end: '11:00' }, { start: '12:00', end: '14:00' }])
  })

  test('a window narrower than the requested duration is excluded entirely', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({
      lean: () => Promise.resolve({ timezone: null, days: [{ dayOfWeek: 3, mode: 'custom', periods: [{ start: '10:00', end: '10:30' }] }] }),
    })
    const result = await getWeeklyAvailability({ teacherId: 't1', durationMinutes: 60 })
    expect(result.days.find((d) => d.dayOfWeek === 3).freeWindows).toEqual([])
  })

  test('the configured buffer pads busy intervals on both sides', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({
      lean: () => Promise.resolve({ timezone: null, days: [{ dayOfWeek: 4, mode: 'custom', periods: [{ start: '10:00', end: '13:00' }] }] }),
    })
    ScheduleRule.find.mockReturnValue(chain([{ daysOfWeek: [4], timeOfDay: '11:00', durationMinutes: 30 }]))
    getAcademySchedulingSettings.mockResolvedValue({ timezone: 'Africa/Cairo', lessonBufferMinutes: 15 })
    const result = await getWeeklyAvailability({ teacherId: 't1', durationMinutes: 30 })
    const thursday = result.days.find((d) => d.dayOfWeek === 4)
    // Busy 11:00-11:30 padded to 10:45-11:45 leaves 10:00-10:45 and 11:45-13:00
    expect(thursday.busyWindows).toEqual([{ start: '10:45', end: '11:45', kind: 'confirmed' }])
    expect(thursday.freeWindows).toEqual([{ start: '10:00', end: '10:45' }, { start: '11:45', end: '13:00' }])
  })
})

describe('checkAvailability', () => {
  const workingDoc = { timezone: null, days: [{ dayOfWeek: 0, mode: 'custom', periods: [{ start: '09:00', end: '17:00' }] }] }

  test('accepts a candidate slot fully inside working hours with nothing booked', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    const result = await checkAvailability({ teacherId: 't1', studentId: 's1', days: [{ dayOfWeek: 0, time: '10:00' }], durationMinutes: 60 })
    expect(result.valid).toBe(true)
    expect(result.conflicts).toEqual([])
  })

  test('rejects a slot outside working hours', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    const result = await checkAvailability({ teacherId: 't1', studentId: 's1', days: [{ dayOfWeek: 0, time: '20:00' }], durationMinutes: 60 })
    expect(result.valid).toBe(false)
    expect(result.conflicts[0].reason).toBe('outside_working_hours')
  })

  test('rejects a slot that only partially fits before the working period ends', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    const result = await checkAvailability({ teacherId: 't1', studentId: 's1', days: [{ dayOfWeek: 0, time: '16:30' }], durationMinutes: 60 })
    expect(result.valid).toBe(false)
    expect(result.conflicts[0].reason).toBe('outside_working_hours')
  })

  test('rejects a teacher conflict from an existing ScheduleRule, tagged as a CONFIRMED booking', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    ScheduleRule.find.mockImplementation((filter) => chain(
      filter.teacherId ? [{ daysOfWeek: [0], timeOfDay: '10:00', durationMinutes: 60 }] : []
    ))
    const result = await checkAvailability({ teacherId: 't1', studentId: 's1', days: [{ dayOfWeek: 0, time: '10:30' }], durationMinutes: 60 })
    expect(result.valid).toBe(false)
    expect(result.conflicts[0].reason).toBe('teacher_conflict')
    expect(result.conflicts[0].kind).toBe('confirmed')
  })

  // Phase 2 change request #1 — a still-pending assignment request (or a
  // teacher's proposed alternative awaiting a decision) must block a second
  // request from the exact same slot, but must be distinguishable from a
  // real, activated booking.
  test('rejects a conflict from another PENDING request, tagged as a TEMPORARY hold, never a confirmed one', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    AssignmentRequest.find.mockImplementation((filter) => chain(
      filter.teacherId ? [{ status: 'pending_teacher_approval', schedule: { days: [{ dayOfWeek: 0, time: '10:00' }] }, lessonDurationMinutes: 60 }] : []
    ))
    const result = await checkAvailability({ teacherId: 't1', studentId: 's2', days: [{ dayOfWeek: 0, time: '10:30' }], durationMinutes: 60 })
    expect(result.valid).toBe(false)
    expect(result.conflicts[0].reason).toBe('teacher_conflict')
    expect(result.conflicts[0].kind).toBe('reserved')
  })

  // The teacher's own proposed alternative time (status time_change_requested)
  // must reserve THAT slot — not the request's original schedule.days, which
  // is no longer what's being held once a time-change is proposed.
  test('a teacher-proposed alternative (time_change_requested) reserves the PROPOSED slot, not the original one', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    AssignmentRequest.find.mockImplementation((filter) => chain(
      filter.teacherId ? [{
        status: 'time_change_requested',
        schedule: { days: [{ dayOfWeek: 0, time: '09:00' }] }, // original slot — no longer held
        teacherResponse: { proposedSchedule: { days: [{ dayOfWeek: 0, time: '11:00' }] } }, // proposed slot — held instead
        lessonDurationMinutes: 60,
      }] : []
    ))
    // The original slot (09:00) is free again...
    const original = await checkAvailability({ teacherId: 't1', studentId: 's2', days: [{ dayOfWeek: 0, time: '09:00' }], durationMinutes: 60 })
    expect(original.valid).toBe(true)
    // ...but the proposed slot (11:00) is held.
    const proposed = await checkAvailability({ teacherId: 't1', studentId: 's2', days: [{ dayOfWeek: 0, time: '11:00' }], durationMinutes: 60 })
    expect(proposed.valid).toBe(false)
    expect(proposed.conflicts[0].kind).toBe('reserved')
  })

  test('rejects a student conflict from an existing Session even when the teacher is free', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    Session.find.mockImplementation((filter) => chain(
      filter.studentId ? [{ scheduledAt: nextSundayAt(10, 0), durationMinutes: 60 }] : []
    ))
    const result = await checkAvailability({ teacherId: 't1', studentId: 's1', days: [{ dayOfWeek: 0, time: '10:00' }], durationMinutes: 60 })
    expect(result.valid).toBe(false)
    expect(result.conflicts[0].reason).toBe('student_conflict')
  })

  test('rejects an invalid day/time shape without touching the DB', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(workingDoc) })
    const result = await checkAvailability({ teacherId: 't1', studentId: 's1', days: [{ dayOfWeek: 9, time: 'bad' }], durationMinutes: 60 })
    expect(result.valid).toBe(false)
    expect(result.conflicts[0].reason).toBe('invalid_day_or_time')
  })

  test('an empty days array is rejected up front', async () => {
    const result = await checkAvailability({ teacherId: 't1', studentId: 's1', days: [], durationMinutes: 60 })
    expect(result.valid).toBe(false)
  })
})

// Builds the real UTC Date corresponding to the given Cairo-local hour/minute
// on the next Sunday, using the exact same conversion the production code
// uses (date-fns-tz) rather than a hand-rolled offset guess.
function nextSundayAt(hour, minute) {
  const now = new Date()
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7
  const target = new Date(now.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000)
  const y = target.getUTCFullYear()
  const m = String(target.getUTCMonth() + 1).padStart(2, '0')
  const d = String(target.getUTCDate()).padStart(2, '0')
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return fromZonedTime(`${y}-${m}-${d} ${hh}:${mm}`, 'Africa/Cairo')
}

// Phase 2 Part 2c — real, availability-derived alternative slots (never a
// hardcoded "+1 hour" guess). Worked examples straight from the spec: a
// 12:00-12:30 booking with no buffer suggests 12:30 next; with a 10-minute
// buffer it suggests 12:40; a 12:00-13:00 booking suggests 13:00 next.
describe('suggestAlternativeSlots', () => {
  const fullDaySunday = { timezone: null, days: [{ dayOfWeek: 0, mode: 'full_day', periods: [] }] }

  test('a 30-minute booking with no buffer suggests the very next free instant on the same day', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(fullDaySunday) })
    AssignmentRequest.find.mockReturnValue(chain([{ schedule: { days: [{ dayOfWeek: 0, time: '12:00' }] }, lessonDurationMinutes: 30 }]))

    const result = await suggestAlternativeSlots({ teacherId: 't1', days: [{ dayOfWeek: 0, time: '12:00' }], durationMinutes: 30, maxResults: 1 })
    expect(result).toEqual([{ dayOfWeek: 0, time: '12:30' }])
  })

  test('the same booking with a 10-minute buffer pushes the suggestion out to 12:40', async () => {
    getAcademySchedulingSettings.mockResolvedValue({ timezone: 'Africa/Cairo', lessonBufferMinutes: 10 })
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(fullDaySunday) })
    AssignmentRequest.find.mockReturnValue(chain([{ schedule: { days: [{ dayOfWeek: 0, time: '12:00' }] }, lessonDurationMinutes: 30 }]))

    const result = await suggestAlternativeSlots({ teacherId: 't1', days: [{ dayOfWeek: 0, time: '12:00' }], durationMinutes: 30, maxResults: 1 })
    expect(result).toEqual([{ dayOfWeek: 0, time: '12:40' }])
  })

  test('a full 12:00-13:00 booking suggests 13:00 next, never a blind "+1 hour" guess for a different duration', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({ lean: () => Promise.resolve(fullDaySunday) })
    AssignmentRequest.find.mockReturnValue(chain([{ schedule: { days: [{ dayOfWeek: 0, time: '12:00' }] }, lessonDurationMinutes: 60 }]))

    const result = await suggestAlternativeSlots({ teacherId: 't1', days: [{ dayOfWeek: 0, time: '12:00' }], durationMinutes: 60, maxResults: 1 })
    expect(result).toEqual([{ dayOfWeek: 0, time: '13:00' }])
  })

  test('falls back to another day at the nearest equivalent time when the requested day has no room at all', async () => {
    TeacherWorkingHours.findOne.mockReturnValue({
      lean: () => Promise.resolve({
        timezone: null,
        days: [{ dayOfWeek: 0, mode: 'unavailable', periods: [] }, { dayOfWeek: 1, mode: 'full_day', periods: [] }],
      }),
    })
    const result = await suggestAlternativeSlots({ teacherId: 't1', days: [{ dayOfWeek: 0, time: '10:00' }], durationMinutes: 30, maxResults: 1 })
    expect(result).toEqual([{ dayOfWeek: 1, time: '10:00' }])
  })
})

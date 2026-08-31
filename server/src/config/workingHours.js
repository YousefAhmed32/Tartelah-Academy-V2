// Teacher weekly working-hours policy — storage shape + validation shared by
// the admin working-hours editor (models/TeacherWorkingHours.js) and its
// controller. Deliberately conservative for Part 1: stores WHAT the teacher's
// weekly availability looks like (full day / unavailable / one-or-more
// custom periods) in a structure the future automatic slot-availability
// engine (Part 2) can consume directly — it does not itself compute free
// slots against booked sessions.
//
// dayOfWeek uses the same 0(Sunday)–6(Saturday) convention as
// ScheduleRule.daysOfWeek, so the two line up without translation.

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]

const WORKING_HOUR_MODES = ['full_day', 'unavailable', 'custom']

// 24h "HH:mm" — deliberately not free text, so overlap/ordering comparisons
// are simple string/number comparisons, and so the frontend and backend
// always agree on format.
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function isValidTimeString(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function isValidMode(value) {
  return WORKING_HOUR_MODES.includes(value)
}

// One default row per day of the week, all "unavailable" — the safe starting
// point for a newly created teacher (never silently implies "available all
// day" until an admin explicitly configures it).
function buildDefaultWorkingHours() {
  return DAYS_OF_WEEK.map((dayOfWeek) => ({ dayOfWeek, mode: 'unavailable', periods: [] }))
}

/**
 * Validates a full week's worth of working-hour day entries. Returns the
 * first Arabic error message, or null if the whole structure is well-formed.
 * Pure function — no DB access — so it's reusable by the controller and unit
 * tests without mocking Mongoose.
 */
function validateWorkingHoursDays(days) {
  if (!Array.isArray(days) || !days.length) {
    return 'يجب إدخال أوقات العمل لكل أيام الأسبوع'
  }
  const seenDays = new Set()
  for (const day of days) {
    if (!day || typeof day !== 'object') return 'صيغة يوم العمل غير صالحة'
    const { dayOfWeek, mode, periods } = day
    if (!DAYS_OF_WEEK.includes(dayOfWeek)) return 'رقم اليوم غير صالح'
    if (seenDays.has(dayOfWeek)) return 'تم تكرار نفس اليوم أكثر من مرة'
    seenDays.add(dayOfWeek)
    if (!isValidMode(mode)) return 'حالة يوم العمل غير صالحة'

    if (mode !== 'custom') {
      if (Array.isArray(periods) && periods.length) {
        return 'لا يمكن إضافة فترات مخصصة إلا عند اختيار "فترات مخصصة" لهذا اليوم'
      }
      continue
    }

    // mode === 'custom' — one or more explicit periods; the "breaks/blocked
    // time" requirement from the brief is represented implicitly as the gap
    // between consecutive periods, rather than a separate breaks array.
    if (!Array.isArray(periods) || !periods.length) {
      return 'يجب إضافة فترة عمل واحدة على الأقل عند اختيار "فترات مخصصة"'
    }
    const ranges = []
    for (const p of periods) {
      if (!p || !isValidTimeString(p.start) || !isValidTimeString(p.end)) {
        return 'صيغة وقت الفترة غير صالحة (استخدم HH:mm)'
      }
      const start = toMinutes(p.start)
      const end = toMinutes(p.end)
      if (start >= end) return 'وقت بداية الفترة يجب أن يكون قبل وقت النهاية'
      ranges.push([start, end])
    }
    ranges.sort((a, b) => a[0] - b[0])
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i][0] < ranges[i - 1][1]) {
        return 'توجد فترات عمل متداخلة في نفس اليوم'
      }
    }
  }
  return null
}

module.exports = {
  DAYS_OF_WEEK, WORKING_HOUR_MODES, TIME_PATTERN,
  isValidTimeString, isValidMode, toMinutes,
  buildDefaultWorkingHours, validateWorkingHoursDays,
}

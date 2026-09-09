// Client twin of server/src/config/assignmentMessage.js + assignment.service.js
// constants — see server/src/config/teacherIdentity.js for why this is
// intentionally duplicated rather than shared (client/server are separate
// deployables with no shared package in this repo). Keep values in sync.
//
// This file is pure, DOM-free logic on purpose (see
// src/utils/__tests__/assignmentSchedule.test.js) — every schedule-time
// computation (slots, suggestions, the monthly preview, date validation)
// lives here rather than inside a React component, so it can be unit-tested
// without a browser/jsdom and reused by more than one component.

export const DAY_LABELS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// Short accessible abbreviations shown on the compact weekday chips — never
// relied on alone (each chip also carries a full aria-label with the day
// name). Matches the existing teacher recurring-schedule modal's convention
// for visual consistency across the app.
export const DAY_ABBR_AR = ['أح', 'ثن', 'ثل', 'أر', 'خم', 'جم', 'سب']

export const DURATION_OPTIONS = [
  { value: 30, label: '30 دقيقة' },
  { value: 45, label: '45 دقيقة' },
  { value: 60, label: 'ساعة كاملة (60 دقيقة)' },
  { value: 90, label: 'ساعة ونصف (90 دقيقة)' },
]

export const TEACHING_TYPE_OPTIONS = [
  { value: 'individual', label: 'حصص فردية' },
  { value: 'group', label: 'حصص جماعية' },
]

// Only recurrence patterns the backend scheduling engine actually executes
// correctly (server/src/services/schedule.service.js#generateDates +
// server/src/services/assignment.service.js's activation) — never show one
// here without matching backend support.
export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'يوميًا', description: 'كل يوم بنفس الموعد' },
  { value: 'weekly', label: 'أسبوعيًا', description: 'أيام محددة كل أسبوع' },
  { value: 'biweekly', label: 'كل أسبوعين', description: 'نفس الأيام كل أسبوعين' },
  { value: 'monthly', label: 'شهريًا', description: 'نفس يوم الشهر كل مرة' },
]

// Recurrence patterns whose weekday selection is meaningful — 'daily' repeats
// every calendar day and 'monthly' repeats on the same day-of-month as the
// start date (server-side: a non-empty daysOfWeek would make 'monthly'
// behave like 'weekly', which is not what "monthly" means — see
// assignment.service.js's activateAssignment), so neither shows a weekday
// selector in the UI.
export const FREQUENCIES_WITH_WEEKDAY_PICKER = ['weekly', 'biweekly']

export const PERIOD_LABELS_AR = { morning: 'صباحًا', afternoon: 'ظهرًا وعصرًا', evening: 'مساءً' }

export const ASSIGNMENT_STATUS_LABELS = {
  draft: { label: 'مسودة', color: '#9ca3af' },
  pending_teacher_approval: { label: 'بانتظار موافقة المعلم', color: '#d97706' },
  accepted: { label: 'مقبول — جارٍ التفعيل', color: '#0891b2' },
  rejected: { label: 'مرفوض', color: '#dc2626' },
  time_change_requested: { label: 'يحتاج تعديل موعد', color: '#dc2626' },
  reassigned: { label: 'أُعيد إسناده', color: '#6b7280' },
  completed: { label: 'مكتمل ومفعّل', color: '#059669' },
  cancelled: { label: 'ملغي', color: '#6b7280' },
}

export const CONFLICT_REASON_LABELS_AR = {
  outside_working_hours: 'خارج أوقات عمل المعلم',
  teacher_conflict: 'الموعد محجوز لدى المعلم',
  student_conflict: 'يتعارض مع موعد آخر للطالب',
  invalid_day_or_time: 'صيغة اليوم أو الوقت غير صالحة',
  crosses_midnight: 'الموعد يتجاوز منتصف الليل',
  no_days_selected: 'يجب اختيار يوم واحد على الأقل',
}

export function dayLabel(dayOfWeek) {
  return DAY_LABELS_AR[dayOfWeek] || ''
}

export function dayAbbr(dayOfWeek) {
  return DAY_ABBR_AR[dayOfWeek] || ''
}

export function durationLabel(minutes) {
  return DURATION_OPTIONS.find((d) => d.value === Number(minutes))?.label || `${minutes} دقيقة`
}

export function frequencyLabel(value) {
  return FREQUENCY_OPTIONS.find((f) => f.value === value)?.label || value
}

export function conflictLabel(conflict) {
  const dayPart = Number.isInteger(conflict.dayOfWeek) ? `${dayLabel(conflict.dayOfWeek)} ${conflict.time ? formatTimeArabic12(conflict.time) : ''}`.trim() : ''
  let reason = CONFLICT_REASON_LABELS_AR[conflict.reason] || conflict.reason
  // Distinguishes a CONFIRMED booking from a TEMPORARY hold (another pending
  // request or a teacher-proposed alternative still awaiting an admin
  // decision) — never blend the two into one generic "unavailable" message.
  if (conflict.kind === 'reserved' && (conflict.reason === 'teacher_conflict' || conflict.reason === 'student_conflict')) {
    reason = 'محجوز مؤقتًا — بانتظار الموافقة'
  }
  return dayPart ? `${dayPart}: ${reason}` : reason
}

/** true when a conflict/busy-window entry is only a temporary hold (a
 * pending assignment request or a teacher's proposed alternative still
 * awaiting a decision) rather than a confirmed, activated booking. */
export function isTemporaryHold(entry) {
  return entry?.kind === 'reserved'
}

export function isValidTimeString(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + m
}

export function minutesToTimeStr(mins) {
  const clamped = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/** Same conversion, but preserves the '24:00' end-of-day sentinel instead of
 * wrapping it to '00:00' — use this for a working-hours WINDOW BOUNDARY
 * (e.g. a full day's end), never for wraparound arithmetic like
 * `addMinutesToTime` (where 23:45+30min correctly becoming '00:15' the next
 * day is exactly what's wanted). Mirrors the backend's identical special
 * case in availability.service.js. */
export function minutesToBoundaryTimeStr(mins) {
  if (mins >= 24 * 60) return '24:00'
  return minutesToTimeStr(mins)
}

/** Adds `minutes` to an "HH:mm" string — pure string/number math, never a
 * `Date` object, so it can never silently pick up the browser's local
 * timezone (the academy's timezone is the only one that matters here, and
 * the backend already resolves every "HH:mm" in that zone). */
export function addMinutesToTime(hhmm, minutes) {
  return minutesToTimeStr(toMinutes(hhmm) + minutes)
}

/**
 * Arabic 12-hour time formatting (e.g. "6:00 م") — deliberately pure string
 * parsing of an "HH:mm" value, never `new Date(...).toLocaleTimeString()`,
 * which would apply the *browser's* local timezone to a bare time string
 * that actually means "this clock time in the academy's timezone." Handles
 * the '24:00' end-of-day sentinel a working-hours full day produces.
 */
export function formatTimeArabic12(hhmm) {
  if (hhmm === '24:00' || hhmm === '00:00') return 'منتصف الليل'
  return formatTimeArabic12Strict(hhmm)
}

/**
 * Same Arabic 12-hour formatting, but ALWAYS numeric — never substitutes the
 * word "منتصف الليل" for 00:00/24:00. Use this (not `formatTimeArabic12`) for
 * a SPECIFIC bookable instant — a slot picker's start time, a selected
 * value, a range's start/end — anywhere the neighboring value is also
 * numeric (e.g. "12:00 ص – 12:30 ص"). Mixing the two ever produced the exact
 * confusing pairing the UX brief flagged: one slot rendered as the word
 * "منتصف الليل" while the very next 30-minute slot rendered as "12:30 ص",
 * even though both are the same kind of value. `formatTimeArabic12` itself
 * stays reserved for describing a working-hours WINDOW BOUNDARY (e.g. "من
 * 6:00 م إلى منتصف الليل"), where the word is genuinely clearer.
 */
export function formatTimeArabic12Strict(hhmm) {
  const normalized = hhmm === '24:00' ? '00:00' : hhmm
  if (!isValidTimeString(normalized)) return ''
  let [h, m] = normalized.split(':').map(Number)
  const period = h >= 12 ? 'م' : 'ص'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Turns a day's raw free-window ranges into a short, friendly Arabic
 * sentence — never the raw "00:00–24:00" technical form. `freeWindows`
 * undefined means "still loading"; `[]` means genuinely nothing available.
 */
export function describeAvailability(freeWindows, durationMinutes) {
  if (freeWindows === undefined) return { kind: 'loading', text: 'جارٍ حساب المواعيد المتاحة…' }
  if (!freeWindows.length) return { kind: 'none', text: 'لا توجد مواعيد تناسب مدة الحصة في هذا اليوم' }
  const isFullDay = freeWindows.length === 1 && freeWindows[0].start === '00:00' && freeWindows[0].end === '24:00'
  if (isFullDay) return { kind: 'full', text: 'متاح طوال اليوم' }
  const parts = freeWindows.map((w) => `من ${formatTimeArabic12(w.start)} إلى ${formatTimeArabic12(w.end)}`)
  return { kind: 'partial', text: `متاح ${parts.join('، و')}` }
}

/**
 * Discrete, tappable candidate start times inside a day's free windows —
 * every slot leaves the FULL lesson duration inside the window (never just
 * checked at the start instant). Purely a client-side slicing of the real
 * backend-computed free windows; no new data is invented.
 */
export function generateTimeSlots(freeWindows, durationMinutes, stepMinutes = 15) {
  const slots = []
  for (const w of freeWindows || []) {
    const end = toMinutes(w.end)
    let start = toMinutes(w.start)
    while (start + durationMinutes <= end) {
      slots.push(minutesToTimeStr(start))
      start += stepMinutes
    }
  }
  return [...new Set(slots)]
}

function windowsOverlap(start, end, windows, kind) {
  return (windows || []).some((w) => w.kind === kind && start < toMinutes(w.end) && end > toMinutes(w.start))
}

/** Builds the complete working-day slot map used by the visual picker.
 * Green slots fit fully inside a real backend free window; every other start
 * inside working hours is busy. This makes occupied time visible without
 * exposing who owns the booking.
 *
 * `busyWindows` (optional, from availability.service.js's `kind`-tagged
 * output) lets a busy slot be classified further: 'busy' (a CONFIRMED
 * booking) vs 'reserved' (only a TEMPORARY hold — a pending request or
 * teacher-proposed alternative still awaiting a decision) — see the brief's
 * "محجوز مؤقتًا — بانتظار الموافقة" requirement. Omitting it keeps the
 * original two-state (available/busy) behavior unchanged. */
export function buildSlotStatusMap(workingWindows, freeWindows, durationMinutes, stepMinutes = 15, busyWindows) {
  const allStarts = generateTimeSlots(workingWindows, durationMinutes, stepMinutes)
  const available = new Set(generateTimeSlots(freeWindows, durationMinutes, stepMinutes))
  return allStarts.map((time) => {
    if (available.has(time)) return { time, status: 'available' }
    if (!busyWindows?.length) return { time, status: 'busy' }
    const start = toMinutes(time)
    const end = start + durationMinutes
    if (windowsOverlap(start, end, busyWindows, 'confirmed')) return { time, status: 'busy' }
    if (windowsOverlap(start, end, busyWindows, 'reserved')) return { time, status: 'reserved' }
    return { time, status: 'busy' }
  })
}

/** Groups slot times into صباحًا / ظهرًا وعصرًا / مساءً for a scannable picker. */
export function groupSlotsByPeriod(slotTimes) {
  const groups = { morning: [], afternoon: [], evening: [] }
  for (const t of slotTimes || []) {
    const h = Number(t.split(':')[0])
    if (h < 12) groups.morning.push(t)
    else if (h < 17) groups.afternoon.push(t)
    else groups.evening.push(t)
  }
  return groups
}

/** Nearest single available slot across the week, skipping any day already
 * excluded (e.g. already selected) — the basis for "أقرب موعد متاح". */
export function findNearestSlot(freeWindowsByDay, durationMinutes, excludeDayOfWeeks = []) {
  for (let dow = 0; dow <= 6; dow++) {
    if (excludeDayOfWeeks.includes(dow)) continue
    const [first] = generateTimeSlots(freeWindowsByDay?.[dow], durationMinutes)
    if (first) return { dayOfWeek: dow, time: first }
  }
  return null
}

/** Another day where the exact same time is also free — "نفس الموعد في يوم آخر". */
export function findSameTimeOtherDay(freeWindowsByDay, time, durationMinutes, excludeDayOfWeeks = []) {
  const start = toMinutes(time)
  const end = start + durationMinutes
  for (let dow = 0; dow <= 6; dow++) {
    if (excludeDayOfWeeks.includes(dow)) continue
    const fits = (freeWindowsByDay?.[dow] || []).some((w) => start >= toMinutes(w.start) && end <= toMinutes(w.end))
    if (fits) return { dayOfWeek: dow, time }
  }
  return null
}

/** A single time that is simultaneously free on every one of `dayOfWeeks` —
 * "نفس الأيام بموعد مختلف". Returns null if no common slot exists. */
export function findCommonTime(freeWindowsByDay, dayOfWeeks, durationMinutes, stepMinutes = 15) {
  if (!dayOfWeeks?.length) return null
  const slotSets = dayOfWeeks.map((dow) => new Set(generateTimeSlots(freeWindowsByDay?.[dow], durationMinutes, stepMinutes)))
  const [first, ...rest] = slotSets
  if (!first) return null
  for (const t of first) {
    if (rest.every((s) => s.has(t))) return t
  }
  return null
}

/**
 * Real, availability-derived schedule suggestions — never fabricated. Each
 * entry can be applied in one action and edited afterward.
 */
export function buildSuggestions({ days, freeWindowsByDay, durationMinutes }) {
  if (!freeWindowsByDay) return []
  const suggestions = []
  const selectedDows = days.map((d) => d.dayOfWeek)

  const nearest = findNearestSlot(freeWindowsByDay, durationMinutes, selectedDows)
  if (nearest) {
    suggestions.push({
      key: 'nearest', label: 'أقرب موعد متاح',
      description: `${dayLabel(nearest.dayOfWeek)} — ${formatTimeArabic12(nearest.time)}`,
      days: [...days, nearest],
    })
  }

  if (days.length === 1) {
    const sameTime = findSameTimeOtherDay(freeWindowsByDay, days[0].time, durationMinutes, selectedDows)
    if (sameTime) {
      suggestions.push({
        key: 'same-time', label: 'نفس الموعد في يوم آخر',
        description: `${dayLabel(sameTime.dayOfWeek)} — ${formatTimeArabic12(sameTime.time)}`,
        days: [...days, sameTime],
      })
    }
  }

  if (days.length >= 2) {
    const commonTime = findCommonTime(freeWindowsByDay, selectedDows, durationMinutes)
    if (commonTime && !days.every((d) => d.time === commonTime)) {
      suggestions.push({
        key: 'common-time', label: 'نفس الأيام بموعد مختلف',
        description: formatTimeArabic12(commonTime),
        days: days.map((d) => ({ ...d, time: commonTime })),
      })
    }
  }

  return suggestions
}

/**
 * Client-only estimate of the concrete occurrence dates a recurrence rule
 * will generate — mirrors server/src/services/schedule.service.js's
 * generateDates() semantics (daily/weekly/biweekly/monthly) so the "monthly
 * preview" reflects the actual recurrence calculation, not a guess. The
 * backend's own bounded session generation on activation remains the
 * authoritative artifact; this is a glance-ahead helper only.
 */
export function computeUpcomingOccurrences({ days, startDate, endDate, frequency = 'weekly' }, { windowDays = 31, maxCount = 40 } = {}) {
  if (!days?.length || !startDate) return []
  const start = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return []
  const endLimit = endDate ? new Date(`${endDate}T00:00:00`) : null
  const windowEnd = new Date(start.getTime() + windowDays * 86400000)
  const startSunday = new Date(start)
  startSunday.setDate(startSunday.getDate() - startSunday.getDay())
  const dayMap = new Map(days.map((d) => [d.dayOfWeek, d.time]))

  const out = []
  const cur = new Date(start)
  let guard = 0
  while (out.length < maxCount && guard++ < windowDays + 14) {
    if (cur > windowEnd || (endLimit && cur > endLimit)) break
    const dow = cur.getDay()
    let include = false
    let time = null
    if (frequency === 'daily') {
      include = true
      time = days[0]?.time
    } else if (frequency === 'monthly') {
      include = cur.getDate() === start.getDate()
      time = days[0]?.time
    } else if (frequency === 'biweekly') {
      const weekNum = Math.floor((cur - startSunday) / (7 * 86400000))
      include = dayMap.has(dow) && weekNum % 2 === 0
      time = dayMap.get(dow)
    } else {
      include = dayMap.has(dow)
      time = dayMap.get(dow)
    }
    if (include && cur >= start) out.push({ date: new Date(cur), dayOfWeek: dow, time })
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/**
 * Derives the canonical `{dayOfWeek,time}[]` array the backend expects from
 * the compact builder's UI-only selection state. This is the ONLY place that
 * translates "what the admin picked" into "what gets submitted" — every
 * consumer (live conflict checks, the weekly summary, the monthly preview,
 * and the final submit payload) calls this instead of re-deriving it,
 * so the frontend never has a second, competing schedule representation.
 *
 * - weekly/biweekly: exactly the selected weekdays, each with its own time.
 * - daily: every day of the week at the same time (the backend's 'daily'
 *   frequency ignores which weekdays are listed and repeats every calendar
 *   day regardless — sending all 7 here means the availability *check*
 *   still validates the time against every real weekday's working hours).
 * - monthly: a single entry on the start date's own weekday (the day-of-
 *   month, not the weekday, is what actually repeats server-side — see
 *   assignment.service.js's activateAssignment).
 */
export function deriveScheduleDays(schedule) {
  if (schedule?.frequency === 'daily') {
    return [0, 1, 2, 3, 4, 5, 6].map((dow) => ({ dayOfWeek: dow, time: schedule.singleTime || '16:00' }))
  }
  if (schedule?.frequency === 'monthly') {
    const dow = schedule.startDate && !Number.isNaN(new Date(`${schedule.startDate}T00:00:00`).getTime())
      ? new Date(`${schedule.startDate}T00:00:00`).getDay() : 0
    return [{ dayOfWeek: dow, time: schedule.singleTime || '16:00' }]
  }
  return [...(schedule?.selectedDayOfWeeks || [])].sort((a, b) => a - b)
    .map((dow) => ({ dayOfWeek: dow, time: schedule.dayTimes?.[dow] || '' }))
}

/**
 * Reverse of `deriveScheduleDays` — rebuilds the compact builder's UI
 * selection state from an existing canonical `days` array (editing a
 * previously-created request, e.g. the admin follow-up queue's "edit &
 * resend"). Round-trips cleanly with `deriveScheduleDays` for weekly/biweekly.
 */
export function hydrateScheduleSelection(days, frequency) {
  if (frequency === 'daily' || frequency === 'monthly') {
    return { selectedDayOfWeeks: [], dayTimes: {}, singleTime: days?.[0]?.time || '16:00' }
  }
  const selectedDayOfWeeks = (days || []).map((d) => d.dayOfWeek)
  const dayTimes = {}
  ;(days || []).forEach((d) => { dayTimes[d.dayOfWeek] = d.time })
  return { selectedDayOfWeeks, dayTimes, singleTime: '16:00' }
}

/** Compact one-line summary for a collapsed student card's header, e.g.
 * "الأحد والثلاثاء • 6:00 م • 30 دقيقة • أسبوعيًا". */
export function scheduleSummaryLabel(schedule) {
  if (!schedule?.enabled) return null
  const days = deriveScheduleDays(schedule)
  if (!days.length) return null
  const isDayBased = schedule.frequency === 'weekly' || schedule.frequency === 'biweekly'
  const dayNames = !isDayBased
    ? null
    : days.length <= 2
      ? days.map((d) => dayLabel(d.dayOfWeek)).join(' و')
      : `${days.length} أيام`
  const uniqueTimes = [...new Set(days.map((d) => d.time))]
  const timeText = uniqueTimes.length === 1 ? formatTimeArabic12(uniqueTimes[0]) : 'مواعيد مختلفة'
  const freq = frequencyLabel(schedule.frequency)
  return [dayNames, timeText, durationLabel(schedule.lessonDurationMinutes), freq].filter(Boolean).join(' • ')
}

/**
 * Frontend mirror of the backend's date-range validation
 * (assignment.service.js's validateSchedulePayload) — start date required
 * and valid; optional end date must be strictly after it; "continues until
 * cancelled" is an explicit state, not an ambiguous empty field. Returns
 * `{ startError, endError }`, each null when valid.
 */
export function validateScheduleDates({ startDate, endDate, noEndDate }) {
  let startError = null
  let endError = null
  if (!startDate) {
    startError = 'تاريخ البداية مطلوب'
  } else if (Number.isNaN(new Date(`${startDate}T00:00:00`).getTime())) {
    startError = 'تاريخ البداية غير صالح'
  }
  if (!noEndDate && endDate) {
    const end = new Date(`${endDate}T00:00:00`)
    if (Number.isNaN(end.getTime())) {
      endError = 'تاريخ النهاية غير صالح'
    } else if (!startError) {
      const start = new Date(`${startDate}T00:00:00`)
      if (end <= start) endError = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية'
    }
  }
  return { startError, endError }
}

/**
 * Full pre-submit validation for one student's schedule — the single
 * function every consumer (wizard, add-student modal, edit-and-resend modal)
 * calls instead of re-implementing the same checks three times. Returns the
 * first Arabic error message, or null when the schedule is submit-ready.
 * Mirrors (client-side) the same rules `assignment.service.js`'s
 * `validateSchedulePayload` enforces authoritatively on the backend.
 */
export function validateScheduleForSubmit(schedule, studentType) {
  if (!schedule?.enabled) return null
  if (!schedule.specialization) return 'يجب تحديد المنهج/التخصص للجدول'
  const days = deriveScheduleDays(schedule)
  if (!days.length) return 'يجب اختيار يوم واحد على الأقل للجدول'
  const { startError, endError } = validateScheduleDates(schedule)
  if (startError) return startError
  if (endError) return endError
  if (studentType === 'new' && schedule.immediateOverride && !schedule.overrideReason?.trim()) {
    return 'سبب الاعتماد الفوري مطلوب'
  }
  return null
}

function toMinutesLocal(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + m
}

/**
 * Client-only free-window estimate for a teacher that does not exist yet
 * (the "create teacher with students" wizard, before submit) — there are no
 * bookings to conflict with, so free windows are simply the just-entered
 * working-hours periods filtered to fit the requested duration. Once the
 * teacher is real, StudentScheduleSection switches to the authoritative
 * server-side availability engine instead of this estimate.
 */
export function computeLocalFreeWindows(workingHoursDays, durationMinutes) {
  const map = {}
  for (let dow = 0; dow <= 6; dow++) {
    const day = (workingHoursDays || []).find((d) => d.dayOfWeek === dow)
    let periods = []
    if (day?.mode === 'full_day') periods = [{ start: 0, end: 24 * 60 }]
    else if (day?.mode === 'custom') periods = (day.periods || []).map((p) => ({ start: toMinutesLocal(p.start), end: toMinutesLocal(p.end) }))
    map[dow] = periods
      .filter((p) => p.end - p.start >= durationMinutes)
      .map((p) => ({ start: minutesToTimeStr(p.start), end: minutesToBoundaryTimeStr(p.end) }))
  }
  return map
}

/**
 * Local (no server round-trip) conflict check for the not-yet-created-teacher
 * case: verifies each chosen day/time fits inside a locally-computed free
 * window, AND does not overlap another student already scheduled with the
 * same not-yet-created teacher within this same wizard session (`siblingDays`
 * — every OTHER student's chosen days/times in the current batch). The real
 * authoritative check still runs on the backend for every student in
 * submission order once the teacher actually exists.
 */
export function localScheduleConflicts(days, durationMinutes, freeWindowsByDay, siblingDaysList = []) {
  const conflicts = []
  for (const d of days) {
    const windows = freeWindowsByDay?.[d.dayOfWeek] || []
    const start = toMinutesLocal(d.time)
    const end = start + durationMinutes
    const fits = windows.some((w) => start >= toMinutesLocal(w.start) && end <= toMinutesLocal(w.end))
    if (!fits) { conflicts.push({ dayOfWeek: d.dayOfWeek, time: d.time, reason: 'outside_working_hours' }); continue }
    for (const siblingDays of siblingDaysList) {
      const sibling = siblingDays.find((sd) => sd.dayOfWeek === d.dayOfWeek)
      if (!sibling) continue
      const sStart = toMinutesLocal(sibling.time)
      const sEnd = sStart + (sibling.durationMinutes || durationMinutes)
      if (start < sEnd && end > sStart) conflicts.push({ dayOfWeek: d.dayOfWeek, time: d.time, reason: 'teacher_conflict' })
    }
  }
  return conflicts
}

export const CURRICULUM_LABELS_AR = {
  tajweed: 'التجويد',
  hifz: 'الحفظ',
  nazra: 'النظر',
  arabic: 'اللغة العربية',
  quran: 'القرآن الكريم',
  other: 'أخرى',
}

export function formatScheduleDays(days) {
  if (!Array.isArray(days) || !days.length) return 'غير محدد'
  return [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((d) => dayLabel(d.dayOfWeek)).join('، ')
}

export function formatScheduleTimes(days) {
  if (!Array.isArray(days) || !days.length) return 'غير محدد'
  const uniqueTimes = [...new Set(days.map((d) => d.time))]
  if (uniqueTimes.length === 1) return formatTimeArabic12(uniqueTimes[0])
  return [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((d) => `${dayLabel(d.dayOfWeek)} ${formatTimeArabic12(d.time)}`).join('، ')
}

export function buildAssignmentMessagePreview({
  teacherName,
  studentGender,
  studentName,
  studentAge,
  curriculum,
  curriculumLabelOverride,
  scheduleDays,
  scheduleTimes,
  lessonDurationMinutes,
  teachingType = 'individual',
  startDate,
}) {
  const introPhrase = studentGender === 'male' ? 'طالب جديد' : studentGender === 'female' ? 'طالبة جديدة' : 'طالب/طالبة جديد/جديدة'
  const dataLabel = studentGender === 'male' ? 'الطالب' : studentGender === 'female' ? 'الطالبة' : 'الطالب/الطالبة'
  const dataPossessive = studentGender === 'male' ? 'بياناته' : studentGender === 'female' ? 'بياناتها' : 'بياناته/بياناتها'
  const daysText = Array.isArray(scheduleDays) ? formatScheduleDays(scheduleDays) : (scheduleDays || 'غير محدد')
  const timesText = Array.isArray(scheduleTimes) ? formatScheduleTimes(scheduleTimes) : (scheduleTimes || 'غير محدد')
  const startDateText = startDate ? new Date(startDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد'
  const curriculumText = curriculumLabelOverride || CURRICULUM_LABELS_AR[curriculum] || curriculum || 'القرآن الكريم'
  const durationText = durationLabel(lessonDurationMinutes)
  const teachingTypeText = teachingType === 'group' ? 'حصص جماعية' : 'حصص فردية'

  return `السلام عليكم ورحمة الله وبركاته 🌷

أ. ${teacherName || 'المعلم الفاضل'}
حفظكم الله ورعاكم 🤍

نحيطكم علمًا بأنه تمت إضافة ${introPhrase} إلى جدول حضرتكم، و${dataPossessive} كالتالي:

━━━━━━━━━━━━━━━━━━
👤 بيانات ${dataLabel}
━━━━━━━━━━━━━━━━━━

🌸 الاسم: ${studentName || '—'}
🎂 العمر: ${studentAge || 'غير محدد'}
📖 المنهج: ${curriculumText}

━━━━━━━━━━━━━━━━━━
🗓️ بيانات الحلقة
━━━━━━━━━━━━━━━━━━

📅 الأيام: ${daysText}
⏰ الموعد: ${timesText}
⏱️ مدة الحصة: ${durationText}
📚 نوع التدريس: ${teachingTypeText}
📆 تاريخ البداية: ${startDateText}

نسأل الله أن يبارك في هذه الحلقة، وينفعكم وينفع بها، ويكتب لكم الأجر والتوفيق في تعليم كتاب الله 🤍

جزاكم الله خيرًا وبارك في علمكم وجهودكم 🌹`
}

// Automatic teacher available-time engine (Phase 2 Part 2 §4 — the engine
// explicitly deferred from Part 1). Computes free weekly slots from working
// hours + existing bookings, and re-validates a specific candidate slot
// authoritatively before anything is saved. The backend is the single source
// of truth here — the frontend's own preview is never trusted for the actual
// save decision (see assignment.service.js, which always calls
// checkAvailability again immediately before writing).
//
// Bounded by design: one indexed query per collection (ScheduleRule/Session/
// AssignmentRequest), scoped to a single teacherId (or studentId) and a
// capped lookahead window for one-off session exceptions — never an
// unbounded scan.
const { toZonedTime } = require('date-fns-tz')
const TeacherWorkingHours = require('../models/TeacherWorkingHours')
const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const AssignmentRequest = require('../models/AssignmentRequest')
const { getAcademySchedulingSettings } = require('./academySettings.service')
const { RESERVING_STATUSES, RESERVING_SLOT_SOURCE } = require('../config/assignmentStatus')
const { isValidTimeString, toMinutes } = require('../config/workingHours')

// How far ahead one-off/exception Session documents are scanned for
// day-of-week + time-of-day collisions. Recurring ScheduleRules themselves
// are matched structurally (by daysOfWeek/timeOfDay), not by walking dates,
// so this window only needs to be wide enough to catch ad-hoc exception
// sessions that don't belong to any rule (e.g. one-off makeup lessons).
const EXCEPTION_LOOKAHEAD_DAYS = 60
const NON_BLOCKING_SESSION_STATUSES = ['cancelled']

function minutesToTimeStr(mins) {
  // 1440 ("end of day") must render as '24:00', not '00:00' — the latter
  // would misleadingly look like a zero-length or start-of-day window.
  if (mins >= 24 * 60) return '24:00'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Subtracts a set of [start,end] busy intervals (minutes-from-midnight, may
// be unsorted/overlapping) from a single [start,end] working period, padding
// each busy interval by `bufferMinutes` on both sides, and returns the
// remaining free sub-intervals.
function subtractIntervals(period, busyIntervals, bufferMinutes) {
  let free = [{ start: period.start, end: period.end }]
  for (const busy of busyIntervals) {
    const bStart = Math.max(0, busy.start - bufferMinutes)
    const bEnd = Math.min(24 * 60, busy.end + bufferMinutes)
    const next = []
    for (const window of free) {
      if (bEnd <= window.start || bStart >= window.end) {
        next.push(window) // no overlap
        continue
      }
      if (bStart > window.start) next.push({ start: window.start, end: Math.min(bStart, window.end) })
      if (bEnd < window.end) next.push({ start: Math.max(bEnd, window.start), end: window.end })
    }
    free = next
  }
  return free.filter((w) => w.end > w.start)
}

// Confirmed (an active ScheduleRule/Session already exists) vs merely
// reserved (an AssignmentRequest still awaiting a decision holds the slot,
// but nothing has actually been scheduled yet) — the distinction the brief's
// "محجوز مؤقتًا — بانتظار الموافقة" requirement needs every availability UI
// to show, instead of one indistinguishable "busy" color.
function classifyBusyKind(source) {
  return (source === 'reserved_request' || source === 'reserved_proposed_time') ? 'reserved' : 'confirmed'
}

// Produces the visual "occupied" map returned to scheduling UIs. Intervals
// are padded by the academy buffer, clipped to working periods, and merged so
// the client never needs booking details (or student identities) to render a
// truthful red/green availability map — but merging only ever happens WITHIN
// the same `kind`, so a confirmed booking can never blend into (and hide) an
// adjacent temporary hold or vice versa.
function blockedIntervalsForPeriods(periods, busyIntervals, bufferMinutes) {
  const clipped = []
  for (const busy of busyIntervals) {
    const paddedStart = Math.max(0, busy.start - bufferMinutes)
    const paddedEnd = Math.min(24 * 60, busy.end + bufferMinutes)
    const kind = classifyBusyKind(busy.source)
    for (const period of periods) {
      const start = Math.max(period.start, paddedStart)
      const end = Math.min(period.end, paddedEnd)
      if (end > start) clipped.push({ start, end, kind })
    }
  }
  clipped.sort((a, b) => a.start - b.start || a.end - b.end)
  const merged = []
  for (const interval of clipped) {
    const previous = merged[merged.length - 1]
    if (!previous || interval.start > previous.end || previous.kind !== interval.kind) merged.push({ ...interval })
    else previous.end = Math.max(previous.end, interval.end)
  }
  return merged
}

function workingPeriodsForDay(dayEntry) {
  if (!dayEntry) return []
  if (dayEntry.mode === 'full_day') return [{ start: 0, end: 24 * 60 }]
  if (dayEntry.mode === 'unavailable') return []
  return (dayEntry.periods || []).map((p) => ({ start: toMinutes(p.start), end: toMinutes(p.end) }))
}

/**
 * Loads and buckets-by-dayOfWeek the busy intervals (minutes-from-midnight)
 * for a user acting as either a teacher or a student, from every source the
 * brief requires: active recurring ScheduleRules, real Session documents
 * (recurring occurrences already generated + genuine one-off exceptions),
 * and currently-reserved AssignmentRequests. `role` is 'teacherId' or
 * 'studentId' — the field name to match against in each collection.
 */
async function loadBusyByDay({ userId, role, timezone, excludeAssignmentRequestId, excludeScheduleRuleIds }) {
  const busyByDay = Array.from({ length: 7 }, () => [])
  // Excludes specific ScheduleRules (and every Session generated from them)
  // from this user's own busy calculation — needed when re-validating a
  // slot for a student/rule that is itself in the process of being moved
  // (transfer.service.js): the student's own current, about-to-end rule at
  // that exact day/time must never register as a conflict against itself.
  const ruleExclusion = excludeScheduleRuleIds?.length ? { _id: { $nin: excludeScheduleRuleIds } } : {}
  const seriesExclusion = excludeScheduleRuleIds?.length ? { seriesId: { $nin: excludeScheduleRuleIds } } : {}

  const [rules, sessions, reserved] = await Promise.all([
    ScheduleRule.find({ [role]: userId, status: 'active', ...ruleExclusion })
      .select('daysOfWeek timeOfDay durationMinutes')
      .lean(),
    Session.find({
      [role]: userId,
      scheduledAt: { $gte: new Date(), $lte: new Date(Date.now() + EXCEPTION_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000) },
      status: { $nin: NON_BLOCKING_SESSION_STATUSES },
      ...seriesExclusion,
    }).select('scheduledAt durationMinutes').lean(),
    AssignmentRequest.find({
      [role]: userId,
      status: { $in: RESERVING_STATUSES },
      ...(excludeAssignmentRequestId ? { _id: { $ne: excludeAssignmentRequestId } } : {}),
    }).select('schedule lessonDurationMinutes status teacherResponse').lean(),
  ])

  for (const rule of rules) {
    const start = toMinutes(rule.timeOfDay || '00:00')
    const end = start + (rule.durationMinutes || 60)
    for (const dow of rule.daysOfWeek || []) {
      if (dow >= 0 && dow <= 6) busyByDay[dow].push({ start, end, source: 'schedule_rule' })
    }
  }

  for (const session of sessions) {
    const zoned = toZonedTime(session.scheduledAt, timezone)
    const dow = zoned.getDay()
    const start = zoned.getHours() * 60 + zoned.getMinutes()
    const end = start + (session.durationMinutes || 60)
    busyByDay[dow].push({ start, end, source: 'session' })
  }

  for (const req of reserved) {
    const source = RESERVING_SLOT_SOURCE[req.status]
    let days
    if (source === 'proposedSchedule') {
      // The teacher's own proposed alternative — hold that slot instead of
      // the original (already-released) requested one. Legacy rows written
      // before `proposedSchedule` existed only have the singular
      // `proposedTime`; fall back to it as a single-day array.
      const proposedDays = req.teacherResponse?.proposedSchedule?.days
      days = proposedDays?.length ? proposedDays : (req.teacherResponse?.proposedTime ? [req.teacherResponse.proposedTime] : [])
    } else {
      days = req.schedule?.days || []
    }
    for (const day of days) {
      if (!isValidTimeString(day.time)) continue
      const start = toMinutes(day.time)
      const end = start + (req.lessonDurationMinutes || 60)
      busyByDay[day.dayOfWeek].push({ start, end, source: source === 'proposedSchedule' ? 'reserved_proposed_time' : 'reserved_request' })
    }
  }

  return busyByDay
}

/**
 * Computes the teacher's free weekly windows that can fit a lesson of
 * `durationMinutes`, per day-of-week (0=Sunday..6=Saturday). Returns windows
 * wide enough to CONTAIN the full lesson duration, not merely a free start
 * instant — a window narrower than durationMinutes is never returned.
 */
async function getWeeklyAvailability({ teacherId, durationMinutes, timezone, excludeAssignmentRequestId, excludeScheduleRuleIds }) {
  const workingHours = await TeacherWorkingHours.findOne({ teacherId }).lean()
  const settings = await getAcademySchedulingSettings()
  const tz = timezone || workingHours?.timezone || settings.timezone
  const buffer = settings.lessonBufferMinutes || 0

  const busyByDay = await loadBusyByDay({ userId: teacherId, role: 'teacherId', timezone: tz, excludeAssignmentRequestId, excludeScheduleRuleIds })

  const days = []
  for (let dow = 0; dow <= 6; dow++) {
    const dayEntry = workingHours?.days?.find((d) => d.dayOfWeek === dow)
    const periods = workingPeriodsForDay(dayEntry)
    const blockedWindows = blockedIntervalsForPeriods(periods, busyByDay[dow], buffer)
    let freeWindows = []
    for (const period of periods) {
      freeWindows.push(...subtractIntervals(period, busyByDay[dow], buffer))
    }
    freeWindows = freeWindows.filter((w) => w.end - w.start >= durationMinutes)
    days.push({
      dayOfWeek: dow,
      mode: dayEntry?.mode || 'unavailable',
      workingWindows: periods.map((w) => ({ start: minutesToTimeStr(w.start), end: minutesToTimeStr(w.end) })),
      // `kind: 'confirmed' | 'reserved'` on each window — see
      // blockedIntervalsForPeriods above. Additive: pre-existing consumers
      // that only read start/end are unaffected.
      busyWindows: blockedWindows.map((w) => ({ start: minutesToTimeStr(w.start), end: minutesToTimeStr(w.end), kind: w.kind })),
      freeWindows: freeWindows.map((w) => ({ start: minutesToTimeStr(w.start), end: minutesToTimeStr(w.end) })),
    })
  }

  return { timezone: tz, bufferMinutes: buffer, durationMinutes, days }
}

/**
 * Authoritative server-side revalidation of a candidate recurring schedule
 * (one or more {dayOfWeek, time} pairs) for a specific teacher+student pair.
 * MUST be called again immediately before any write (accept, immediate
 * assignment, edit-and-resend) — never trust a slot the frontend merely
 * displayed earlier as free; state can have changed since.
 *
 * `excludeAssignmentRequestId` lets a request re-validate against everyone
 * ELSE's reservations while re-checking its own already-held slot (e.g. the
 * teacher accepting the exact slot their own pending request already holds).
 */
async function checkAvailability({ teacherId, studentId, days, durationMinutes, timezone, excludeAssignmentRequestId, excludeScheduleRuleIds }) {
  if (!Array.isArray(days) || !days.length) return { valid: false, conflicts: [{ reason: 'no_days_selected' }] }

  const settings = await getAcademySchedulingSettings()
  const workingHours = await TeacherWorkingHours.findOne({ teacherId }).lean()
  const tz = timezone || workingHours?.timezone || settings.timezone
  const buffer = settings.lessonBufferMinutes || 0

  const [teacherBusyByDay, studentBusyByDay] = await Promise.all([
    loadBusyByDay({ userId: teacherId, role: 'teacherId', timezone: tz, excludeAssignmentRequestId, excludeScheduleRuleIds }),
    studentId ? loadBusyByDay({ userId: studentId, role: 'studentId', timezone: tz, excludeAssignmentRequestId, excludeScheduleRuleIds }) : Promise.resolve(Array.from({ length: 7 }, () => [])),
  ])

  const conflicts = []
  for (const day of days) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6 || !isValidTimeString(day.time)) {
      conflicts.push({ dayOfWeek: day.dayOfWeek, time: day.time, reason: 'invalid_day_or_time' })
      continue
    }
    const start = toMinutes(day.time)
    const end = start + durationMinutes
    if (end > 24 * 60) {
      conflicts.push({ dayOfWeek: day.dayOfWeek, time: day.time, reason: 'crosses_midnight' })
      continue
    }

    // Teacher must be within a working period covering the FULL duration.
    const dayEntry = workingHours?.days?.find((d) => d.dayOfWeek === day.dayOfWeek)
    const periods = workingPeriodsForDay(dayEntry)
    const withinWorkingHours = periods.some((p) => start >= p.start && end <= p.end)
    if (!withinWorkingHours) {
      conflicts.push({ dayOfWeek: day.dayOfWeek, time: day.time, reason: 'outside_working_hours' })
      continue
    }

    const overlaps = (busy) => {
      const bStart = Math.max(0, busy.start - buffer)
      const bEnd = Math.min(24 * 60, busy.end + buffer)
      return start < bEnd && end > bStart
    }

    const teacherConflict = teacherBusyByDay[day.dayOfWeek].find(overlaps)
    if (teacherConflict) {
      // `kind` tells the caller whether this is a CONFIRMED booking (an
      // active ScheduleRule/Session) or only a TEMPORARY hold (another
      // pending request/proposal) — the brief's explicit requirement to
      // return "which day/time conflicts and whether the conflict is
      // confirmed or temporarily held" so the UI can explain it accurately
      // instead of a generic "unavailable".
      conflicts.push({ dayOfWeek: day.dayOfWeek, time: day.time, reason: 'teacher_conflict', source: teacherConflict.source, kind: classifyBusyKind(teacherConflict.source) })
      continue
    }

    const studentConflict = studentBusyByDay[day.dayOfWeek].find(overlaps)
    if (studentConflict) {
      conflicts.push({ dayOfWeek: day.dayOfWeek, time: day.time, reason: 'student_conflict', source: studentConflict.source, kind: classifyBusyKind(studentConflict.source) })
    }
  }

  return { valid: conflicts.length === 0, conflicts, timezone: tz }
}

/**
 * Given a requested (and now-conflicting) candidate schedule, computes real,
 * availability-derived alternative slots — never a hardcoded "+1 hour" guess.
 * Used both for the 409 conflict response (Phase 2 Part 2c §4 — "اخترنا لك
 * أقرب المواعيد المتاحة") and for the wizard's "next slot" suggestion shown
 * after a student is saved. Preference order per requested day:
 *   1. same day, at-or-after the requested time (nearest first)
 *   2. same day, before the requested time (nearest first)
 *   3. other days, nearest time to the one requested
 * All candidates come from `getWeeklyAvailability()`'s real free windows, so
 * a suggestion is only ever returned if it is genuinely bookable right now.
 */
async function suggestAlternativeSlots({ teacherId, days, durationMinutes, timezone, excludeAssignmentRequestId, excludeScheduleRuleIds, maxResults = 3 }) {
  const weekly = await getWeeklyAvailability({ teacherId, durationMinutes, timezone, excludeAssignmentRequestId, excludeScheduleRuleIds })
  const byDay = new Map(weekly.days.map((d) => [d.dayOfWeek, d.freeWindows.map((w) => ({ start: toMinutes(w.start), end: w.end === '24:00' ? 24 * 60 : toMinutes(w.end) }))]))

  const results = []
  const seen = new Set()
  const pushCandidate = (dayOfWeek, startMin) => {
    const key = `${dayOfWeek}:${startMin}`
    if (seen.has(key)) return
    seen.add(key)
    results.push({ dayOfWeek, time: minutesToTimeStr(startMin) })
  }

  const requested = (Array.isArray(days) ? days : []).filter((d) => Number.isInteger(d.dayOfWeek) && isValidTimeString(d.time))

  for (const req of requested) {
    if (results.length >= maxResults) break
    const dow = req.dayOfWeek
    const reqStart = toMinutes(req.time)
    const windows = byDay.get(dow) || []

    // 1) same day, at-or-after requested time
    const afterCandidates = []
    for (const w of windows) {
      const from = Math.max(w.start, reqStart)
      if (from + durationMinutes <= w.end) afterCandidates.push(from)
    }
    afterCandidates.sort((a, b) => a - b)
    for (const c of afterCandidates) {
      if (results.length >= maxResults) break
      pushCandidate(dow, c)
    }

    // 2) same day, before requested time (nearest first)
    if (results.length < maxResults) {
      const beforeCandidates = []
      for (const w of windows) {
        if (w.start < reqStart) beforeCandidates.push(Math.min(w.start, reqStart - durationMinutes))
      }
      beforeCandidates.sort((a, b) => b - a)
      for (const c of beforeCandidates) {
        if (results.length >= maxResults) break
        if (c >= 0) pushCandidate(dow, c)
      }
    }
  }

  // 3) other days, nearest time to the (first) requested time
  if (results.length < maxResults && requested.length) {
    const reqStart = toMinutes(requested[0].time)
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !requested.some((r) => r.dayOfWeek === d))
    const candidates = []
    for (const dow of otherDays) {
      for (const w of byDay.get(dow) || []) {
        const from = Math.max(w.start, Math.min(reqStart, w.end - durationMinutes))
        if (from + durationMinutes <= w.end && from >= w.start) {
          candidates.push({ dow, start: from, distance: Math.abs(from - reqStart) })
        }
      }
    }
    candidates.sort((a, b) => a.distance - b.distance)
    for (const c of candidates) {
      if (results.length >= maxResults) break
      pushCandidate(c.dow, c.start)
    }
  }

  return results.slice(0, maxResults)
}

module.exports = {
  getWeeklyAvailability, checkAvailability, suggestAlternativeSlots,
  blockedIntervalsForPeriods, EXCEPTION_LOOKAHEAD_DAYS,
}

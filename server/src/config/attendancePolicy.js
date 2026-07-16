// Centralized attendance/session operational policy.
//
// The academy is run by non-technical, sometimes older users teaching 1-on-1
// external (Zoom/Meet/Teams) lessons the platform cannot observe directly.
// Every timing rule that affects a teacher's or student's experience — or a
// payroll decision — must be defined here, not re-implemented ad hoc in a
// controller or a React component. The backend is authoritative; the
// frontend mirrors these numbers only for display (see client/src/config/constants.js).
//
// Design principle: soft windows, not hard punishment. Nothing here should
// ever silently and irreversibly mark a person absent — it should move a
// session through graduated, correctable states while preserving real
// timestamps for later review.

const POLICY = {
  // How long before the scheduled start a session becomes operationally
  // visible/actionable (check-in, link, readiness).
  PRE_SESSION_ACCESS_MINUTES: 60,

  // How long after the scheduled END a session remains in completely normal,
  // no-warning editing territory (finalizing attendance, confirming outcome).
  POST_SESSION_GRACE_MINUTES: 60,

  // Additional window after the grace period during which the teacher can
  // still complete/correct the session; actions here are accepted but
  // stamped as "late completion" for transparency, not blocked.
  EXTENDED_COMPLETION_MINUTES: 180,

  // A teacher checking in within this many minutes of scheduledAt is
  // considered on_time rather than late (business rule: 0-5min = on time,
  // >5min = late).
  LATE_TOLERANCE_MINUTES: 5,

  // How long after the extended window closes (i.e. how long after
  // scheduled end + grace + extended) an untouched session gets softly
  // classified as `missed` by the sweep job. This is NOT an absence
  // determination yet — just "unresolved, needs attention."
  // (= POST_SESSION_GRACE_MINUTES + EXTENDED_COMPLETION_MINUTES, kept
  // explicit here so the two windows can diverge later without surprises.)
  MISSED_AFTER_MINUTES: 240,

  // Only after this much additional silence does the sweep make the harder
  // (still admin-correctable) call of no_show/absent/non_payable.
  ABSENCE_AFTER_MINUTES: 240 + 180, // 7 hours total past scheduled end
}

/**
 * Classifies a teacher's platform check-in against the scheduled start time.
 * Never throws, never claims more certainty than a timestamp comparison
 * actually provides.
 */
function classifyCheckIn(scheduledAt, checkInAt, toleranceMinutes = POLICY.LATE_TOLERANCE_MINUTES) {
  const diffMinutes = Math.round((new Date(checkInAt).getTime() - new Date(scheduledAt).getTime()) / 60000)
  const lateMinutes = Math.max(0, diffMinutes)
  return {
    status: lateMinutes > toleranceMinutes ? 'late' : 'on_time',
    lateMinutes,
  }
}

/**
 * Returns the full set of named time boundaries around a session, plus a
 * human-relevant `phase` label. Pure function of (scheduledAt, durationMinutes, now)
 * — nothing is persisted, so this can never drift from the policy constants.
 */
function getSessionWindow(scheduledAt, durationMinutes = 60, now = new Date()) {
  const start = new Date(scheduledAt)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  const preOpensAt = new Date(start.getTime() - POLICY.PRE_SESSION_ACCESS_MINUTES * 60000)
  const graceEndsAt = new Date(end.getTime() + POLICY.POST_SESSION_GRACE_MINUTES * 60000)
  const extendedEndsAt = new Date(graceEndsAt.getTime() + POLICY.EXTENDED_COMPLETION_MINUTES * 60000)

  const t = now.getTime()
  let phase
  if (t < preOpensAt.getTime()) phase = 'upcoming'
  else if (t < start.getTime()) phase = 'pre_session'
  else if (t < end.getTime()) phase = 'in_progress'
  else if (t < graceEndsAt.getTime()) phase = 'grace_period'
  else if (t < extendedEndsAt.getTime()) phase = 'extended_completion'
  else phase = 'overdue'

  return {
    scheduledStart: start,
    scheduledEnd: end,
    preSessionOpensAt: preOpensAt,
    postSessionGraceEndsAt: graceEndsAt,
    extendedCompletionEndsAt: extendedEndsAt,
    phase,
    isActionable: phase !== 'upcoming', // pre_session onward, a teacher can act
    isLateCompletion: phase === 'extended_completion' || phase === 'overdue',
  }
}

module.exports = { POLICY, classifyCheckIn, getSessionWindow }

// Centralized lesson-wallet / deduction policy — sibling to attendancePolicy.js
// and built on the same design principle: soft, transparent, always-correctable
// rules, never a silent/irreversible balance change. Every wallet-affecting
// decision in the platform must be defined here, not re-implemented ad hoc in
// a controller.

const POLICY = {
  // A student who cancels at least this many hours before scheduledAt gets
  // their lesson credit back in full. Cancelling inside this window is
  // treated the same as attending (the slot was held, the teacher was
  // available) — the lesson is deducted.
  CANCELLATION_WINDOW_HOURS: 12,
}

/**
 * Whether a student's cancellation of `session` falls inside or outside the
 * no-penalty cancellation window. Pure function of (scheduledAt, now).
 */
function isWithinCancellationWindow(scheduledAt, now = new Date()) {
  const hoursUntilStart = (new Date(scheduledAt).getTime() - now.getTime()) / (60 * 60 * 1000)
  return hoursUntilStart >= POLICY.CANCELLATION_WINDOW_HOURS
}

module.exports = { POLICY, isWithinCancellationWindow }

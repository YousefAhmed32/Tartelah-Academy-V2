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

class OpeningBalanceError extends Error {
  constructor(message) {
    super(message)
    this.status = 400
  }
}

/**
 * Computes a new subscription's opening lesson balance from a package total
 * plus at most one of {lessonsUsed, lessonsRemaining} (the caller enters
 * whichever they know; the other is derived). Pure function — no DB access —
 * so it's independently unit-testable and reusable by both the standalone
 * "create subscription" endpoint and the teacher-onboarding wizard.
 *
 * Providing neither field defaults to "brand-new package, nothing consumed
 * yet" (used: 0, remaining: packageTotal) — the same behavior the platform
 * had before this field existed, preserving backward compatibility.
 *
 * Throws OpeningBalanceError (status 400, Arabic message) on invalid input.
 */
function computeOpeningBalance({ packageTotal, lessonsUsed, lessonsRemaining }) {
  const total = Number(packageTotal)
  if (!Number.isFinite(total) || total < 0) {
    throw new OpeningBalanceError('إجمالي عدد حصص الباقة غير صالح')
  }

  const hasUsed = lessonsUsed !== undefined && lessonsUsed !== null && lessonsUsed !== ''
  const hasRemaining = lessonsRemaining !== undefined && lessonsRemaining !== null && lessonsRemaining !== ''

  if (hasUsed && hasRemaining) {
    throw new OpeningBalanceError('أدخل عدد الحصص المستخدمة أو المتبقية فقط، وليس كليهما')
  }

  let used
  let remaining
  if (hasUsed) {
    used = Number(lessonsUsed)
    if (!Number.isInteger(used) || used < 0) throw new OpeningBalanceError('عدد الحصص المستخدمة غير صالح')
    if (used > total) throw new OpeningBalanceError('عدد الحصص المستخدمة أكبر من إجمالي حصص الباقة')
    remaining = total - used
  } else if (hasRemaining) {
    remaining = Number(lessonsRemaining)
    if (!Number.isInteger(remaining) || remaining < 0) throw new OpeningBalanceError('عدد الحصص المتبقية غير صالح')
    if (remaining > total) throw new OpeningBalanceError('عدد الحصص المتبقية أكبر من إجمالي حصص الباقة')
    used = total - remaining
  } else {
    used = 0
    remaining = total
  }

  return { used, remaining, total }
}

module.exports = { POLICY, isWithinCancellationWindow, computeOpeningBalance, OpeningBalanceError }

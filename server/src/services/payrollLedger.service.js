const mongoose = require('mongoose')
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const User = require('../models/User')
const { getOrCreatePeriod } = require('./payrollPeriod.service')
const { getPeriodKeyForDate } = require('../config/payrollPeriod')
const { getAcademyTimezone } = require('./academySettings.service')

const PAYROLL_TO_ENTRY_TYPE = {
  payable: 'session_payable',
  non_payable: 'session_non_payable',
  pending_review: 'session_pending_review',
}

/**
 * Canonical hourly-payroll formula (meeting-addendum follow-up):
 *   sessionPay = hourlyRateSnapshot * payableDurationMinutes / 60
 * `payableDurationMinutes` is the session's full scheduled duration when the
 * teacher fulfilled it — the established policy (see
 * sessionIntelligence.service.js#computePayrollStatus) is that the teacher
 * is compensated for holding the slot regardless of student attendance, so
 * "payable duration" is never reduced by the student's own no-show. A
 * distinct `scheduledDurationMinutes` snapshot is kept alongside it so a
 * future partial-session policy (e.g. an early-ended session) has a real
 * field to diverge from without a schema change.
 */
function computeSessionPay(hourlyRate, payableDurationMinutes) {
  const rate = Number(hourlyRate) || 0
  const minutes = Number(payableDurationMinutes) || 0
  return Math.round(((rate * minutes) / 60) * 100) / 100 // round to 2 decimal places — currency amount
}

/**
 * Records (or idempotently updates) the persisted payroll artifact for one
 * resolved session. Only `payable`/`non_payable`/`pending_review` produce an
 * entry — `pending` (unresolved) and `excluded` (cancelled/rescheduled)
 * sessions never carry a payroll amount worth persisting.
 *
 * Correction semantics: while the entry is still `pending` (not yet part of
 * an approved/paid payroll period), a recompute safely updates it in place —
 * this is the common case (attendance finalized shortly after the session,
 * before any payroll run has looked at it). Once an entry has moved past
 * `pending`, or its period has already been approved/paid, it is NEVER
 * silently rewritten: it is voided and a fresh entry is created and linked
 * both ways (`supersedes`/`supersededBy`), so the original amount stays
 * permanently readable and the correction is its own auditable row — see
 * "Maintain a complete adjustment history rather than overwriting."
 */
async function recordEntry(session, { payrollStatus, reason, businessRule, createdBy } = {}) {
  const type = PAYROLL_TO_ENTRY_TYPE[payrollStatus]
  if (!type) return null

  const teacher = await User.findById(session.teacherId).select('salaryPerSession hourlyRate')
  const hourlyRate = teacher?.hourlyRate || 0
  const legacyRate = teacher?.salaryPerSession || 0
  const scheduledDurationMinutes = session.durationMinutes || 0
  // Payable duration == full scheduled duration whenever the session is
  // payable at all — see the policy note above. Non-payable/pending-review
  // entries carry a real duration snapshot too (useful for reporting) but
  // it never multiplies into a nonzero amount for those statuses.
  const payableDurationMinutes = payrollStatus === 'payable' ? scheduledDurationMinutes : 0
  const amount = payrollStatus === 'payable' ? computeSessionPay(hourlyRate, payableDurationMinutes) : 0

  const timezone = await getAcademyTimezone()
  const { year, month } = getPeriodKeyForDate(session.scheduledAt || new Date(), timezone)
  const period = await getOrCreatePeriod(session.teacherId, year, month)

  const fields = {
    teacherId: session.teacherId, type, amount, currency: 'EGP',
    hourlyRateSnapshot: hourlyRate, scheduledDurationMinutes, payableDurationMinutes,
    rateSnapshot: legacyRate, businessRule, reason, createdBy, periodId: period._id,
  }

  const existing = await TeacherPayrollEntry.findOne({ sessionId: session._id, voided: false })

  if (!existing) {
    return TeacherPayrollEntry.create({ sessionId: session._id, ...fields })
  }

  if (existing.status === 'pending') {
    // Still pre-approval — safe to refresh in place, no correction chain needed.
    Object.assign(existing, fields)
    await existing.save()
    return existing
  }

  // Past pending (approved/paid, or its period has moved on) — void +
  // replace instead of mutating a number that may already be part of an
  // approved/paid figure someone has seen.
  if (amount === existing.amount && type === existing.type) return existing // nothing actually changed — no-op

  existing.voided = true
  existing.voidedReason = 'إعادة حساب تلقائية بعد تعديل بيانات الحصة'
  existing.voidedAt = new Date()
  existing.voidedBy = createdBy
  await existing.save()

  const replacement = await TeacherPayrollEntry.create({ sessionId: session._id, supersedes: existing._id, ...fields })
  existing.supersededBy = replacement._id
  await existing.save()
  return replacement
}

function dateRangeMatch(from, to) {
  if (!from && !to) return {}
  const range = {}
  if (from) range.$gte = new Date(from)
  if (to) range.$lte = new Date(to)
  return { createdAt: range }
}

/** Sums payable-entry amounts for one teacher over an optional period (voided entries excluded). */
async function getEarnedAmount(teacherId, { from, to } = {}) {
  const rows = await TeacherPayrollEntry.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), type: 'session_payable', voided: false, ...dateRangeMatch(from, to) } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ])
  return { totalAmount: rows[0]?.totalAmount || 0, payableSessions: rows[0]?.count || 0 }
}

/** Org-wide payroll totals, one row per teacher — sourced from the ledger. */
async function getOrgEarnedAmounts({ from, to } = {}) {
  const rows = await TeacherPayrollEntry.aggregate([
    { $match: { type: 'session_payable', voided: false, ...dateRangeMatch(from, to) } },
    { $group: { _id: '$teacherId', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ])
  const byTeacher = new Map(rows.map(r => [r._id.toString(), { totalAmount: r.totalAmount, payableSessions: r.count }]))
  return byTeacher
}

module.exports = { recordEntry, getEarnedAmount, getOrgEarnedAmounts, computeSessionPay }

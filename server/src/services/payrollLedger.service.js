const mongoose = require('mongoose')
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const User = require('../models/User')

const PAYROLL_TO_ENTRY_TYPE = {
  payable: 'session_payable',
  non_payable: 'session_non_payable',
  pending_review: 'session_pending_review',
}

/**
 * Records (or idempotently updates) the persisted payroll artifact for one
 * resolved session. Only `payable`/`non_payable`/`pending_review` produce an
 * entry — `pending` (unresolved) and `excluded` (cancelled/rescheduled)
 * sessions never carry a payroll amount worth persisting.
 *
 * Once an entry has moved past `pending` status (approved/paid by an admin
 * payroll run), it is never silently overwritten by a later system
 * recompute — same "durable admin decision" principle as
 * Session.payrollStatusSetBy.
 */
async function recordEntry(session, { payrollStatus, reason, createdBy } = {}) {
  const type = PAYROLL_TO_ENTRY_TYPE[payrollStatus]
  if (!type) return null

  const existing = await TeacherPayrollEntry.findOne({ sessionId: session._id })
  if (existing && existing.status !== 'pending') return existing

  const teacher = await User.findById(session.teacherId).select('salaryPerSession')
  const rate = teacher?.salaryPerSession || 0
  const amount = payrollStatus === 'payable' ? rate : 0

  return TeacherPayrollEntry.findOneAndUpdate(
    { sessionId: session._id },
    { $set: { teacherId: session.teacherId, type, amount, rateSnapshot: rate, reason, createdBy } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

function dateRangeMatch(from, to) {
  if (!from && !to) return {}
  const range = {}
  if (from) range.$gte = new Date(from)
  if (to) range.$lte = new Date(to)
  return { createdAt: range }
}

/** Sums payable-entry amounts for one teacher over an optional period. */
async function getEarnedAmount(teacherId, { from, to } = {}) {
  const rows = await TeacherPayrollEntry.aggregate([
    { $match: { teacherId: new mongoose.Types.ObjectId(teacherId), type: 'session_payable', ...dateRangeMatch(from, to) } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ])
  return { totalAmount: rows[0]?.totalAmount || 0, payableSessions: rows[0]?.count || 0 }
}

/** Org-wide payroll totals, one row per teacher — sourced from the ledger. */
async function getOrgEarnedAmounts({ from, to } = {}) {
  const rows = await TeacherPayrollEntry.aggregate([
    { $match: { type: 'session_payable', ...dateRangeMatch(from, to) } },
    { $group: { _id: '$teacherId', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ])
  const byTeacher = new Map(rows.map(r => [r._id.toString(), { totalAmount: r.totalAmount, payableSessions: r.count }]))
  return byTeacher
}

module.exports = { recordEntry, getEarnedAmount, getOrgEarnedAmounts }

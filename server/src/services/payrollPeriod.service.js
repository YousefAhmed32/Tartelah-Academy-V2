const mongoose = require('mongoose')
const TeacherPayrollPeriod = require('../models/TeacherPayrollPeriod')
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const User = require('../models/User')
const { buildPeriodKey, getPeriodKeyForDate } = require('../config/payrollPeriod')
const { getAcademyTimezone } = require('./academySettings.service')

class PayrollPeriodError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

function toObjectId(id) { return new mongoose.Types.ObjectId(id) }

/** Idempotent get-or-create for one teacher's one calendar-month period. */
async function getOrCreatePeriod(teacherId, year, month) {
  const periodKey = buildPeriodKey(year, month)
  return TeacherPayrollPeriod.findOneAndUpdate(
    { teacherId, periodKey },
    { $setOnInsert: { teacherId, year, month, periodKey } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

/** Resolves "now, in the academy's configured timezone" to a period, creating it if needed. */
async function getOrCreateCurrentPeriod(teacherId) {
  const timezone = await getAcademyTimezone()
  const { year, month } = getPeriodKeyForDate(new Date(), timezone)
  return getOrCreatePeriod(teacherId, year, month)
}

/**
 * Live rollup of every non-voided ledger entry in one period — cheap (one
 * indexed aggregation scoped to a single teacher+period), used while the
 * period is still open/pending_review. Once approved, the period document's
 * own frozen fields are authoritative instead (see approvePeriod below).
 */
async function computeLiveTotals(periodId) {
  const rows = await TeacherPayrollEntry.aggregate([
    { $match: { periodId: toObjectId(periodId), voided: false } },
    { $group: { _id: '$type', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ])
  const byType = Object.fromEntries(rows.map(r => [r._id, { amount: r.amount, count: r.count }]))
  const grossEntitlement = byType.session_payable?.amount || 0
  const bonusesTotal = byType.bonus?.amount || 0
  const deductionsTotal = byType.penalty?.amount || 0 // stored as a negative amount
  const settlementsTotal = byType.manual_adjustment?.amount || 0
  const sessionCount = (byType.session_payable?.count || 0) + (byType.session_non_payable?.count || 0) + (byType.session_pending_review?.count || 0)
  const payableSessionCount = byType.session_payable?.count || 0
  return {
    grossEntitlement, bonusesTotal, deductionsTotal, settlementsTotal,
    netPayable: grossEntitlement + bonusesTotal + deductionsTotal + settlementsTotal,
    sessionCount, payableSessionCount,
  }
}

function snapshotFields(totals) {
  const { grossEntitlement, bonusesTotal, deductionsTotal, settlementsTotal, netPayable, sessionCount, payableSessionCount } = totals
  return { grossEntitlement, bonusesTotal, deductionsTotal, settlementsTotal, netPayable, sessionCount, payableSessionCount }
}

/** One period + its totals (live while open, the frozen snapshot once approved/paid). */
async function getPeriodWithTotals(periodId) {
  const period = await TeacherPayrollPeriod.findById(periodId).populate('teacherId', 'firstNameAr lastNameAr avatar email')
  if (!period) return null
  const obj = period.toObject()
  if (['open', 'pending_review'].includes(period.status)) {
    Object.assign(obj, await computeLiveTotals(period._id))
  }
  return obj
}

async function submitForReview(periodId, { actorId, reason } = {}) {
  const period = await TeacherPayrollPeriod.findById(periodId)
  if (!period) throw new PayrollPeriodError('الفترة غير موجودة', 404)
  if (!['open'].includes(period.status)) throw new PayrollPeriodError('لا يمكن إرسال هذه الفترة للمراجعة من حالتها الحالية', 409)
  const totals = await computeLiveTotals(period._id)
  period.status = 'pending_review'
  period.history.push({ action: 'submitted', actorId, reason, snapshot: snapshotFields(totals) })
  await period.save()
  return period
}

/**
 * Freezes the live totals into the period document — from this point on,
 * a later correction entry landing in this (now-closed) period is visible
 * in the ledger but never silently changes this stored, already-approved
 * number. Only `reopenPeriod` (an explicit, reasoned, audited action) can
 * bring the period back to live-recompute mode.
 */
async function approvePeriod(periodId, { actorId, reason } = {}) {
  const period = await TeacherPayrollPeriod.findById(periodId)
  if (!period) throw new PayrollPeriodError('الفترة غير موجودة', 404)
  if (!['open', 'pending_review'].includes(period.status)) throw new PayrollPeriodError('هذه الفترة معتمدة أو مدفوعة بالفعل', 409)
  const totals = await computeLiveTotals(period._id)
  Object.assign(period, snapshotFields(totals))
  period.status = 'approved'
  period.snapshotAt = new Date()
  period.approvedBy = actorId
  period.approvedAt = new Date()
  period.history.push({ action: 'approved', actorId, reason, snapshot: snapshotFields(totals) })
  await period.save()
  return period
}

async function markPaid(periodId, { actorId, reference, reason } = {}) {
  const period = await TeacherPayrollPeriod.findById(periodId)
  if (!period) throw new PayrollPeriodError('الفترة غير موجودة', 404)
  if (period.status === 'paid') return period // idempotent no-op — safe against a duplicate "mark paid" click
  if (period.status !== 'approved') throw new PayrollPeriodError('يجب اعتماد الفترة أولًا قبل تحديدها كمدفوعة', 409)
  period.status = 'paid'
  period.paidBy = actorId
  period.paidAt = new Date()
  period.paidReference = reference
  period.history.push({
    action: 'paid', actorId, reason,
    snapshot: snapshotFields({
      grossEntitlement: period.grossEntitlement, bonusesTotal: period.bonusesTotal, deductionsTotal: period.deductionsTotal,
      settlementsTotal: period.settlementsTotal, netPayable: period.netPayable, sessionCount: period.sessionCount, payableSessionCount: period.payableSessionCount,
    }),
  })
  await period.save()
  return period
}

/** Explicit, reasoned reopening of an approved/paid period back to `open` (live totals resume). */
async function reopenPeriod(periodId, { actorId, reason } = {}) {
  if (!reason?.trim()) throw new PayrollPeriodError('سبب إعادة الفتح مطلوب', 400, 'reason')
  const period = await TeacherPayrollPeriod.findById(periodId)
  if (!period) throw new PayrollPeriodError('الفترة غير موجودة', 404)
  if (!['approved', 'paid'].includes(period.status)) throw new PayrollPeriodError('هذه الفترة ليست معتمدة أو مدفوعة لإعادة فتحها', 409)
  period.history.push({
    action: 'reopened', actorId, reason: reason.trim(),
    snapshot: snapshotFields({
      grossEntitlement: period.grossEntitlement, bonusesTotal: period.bonusesTotal, deductionsTotal: period.deductionsTotal,
      settlementsTotal: period.settlementsTotal, netPayable: period.netPayable, sessionCount: period.sessionCount, payableSessionCount: period.payableSessionCount,
    }),
  })
  period.status = 'open'
  await period.save()
  return period
}

/** Org-wide payroll-period board for one calendar month — one row per active teacher. */
async function listOrgPeriodsForMonth(year, month, { page = 1, limit = 50 } = {}) {
  const teachers = await User.find({ role: 'teacher', isActive: true })
    .select('firstNameAr lastNameAr avatar email hourlyRate')
    .sort({ firstNameAr: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
  const total = await User.countDocuments({ role: 'teacher', isActive: true })

  const rows = await Promise.all(teachers.map(async (t) => {
    const period = await getOrCreatePeriod(t._id, year, month)
    const withTotals = await getPeriodWithTotals(period._id)
    return { ...withTotals, teacherId: { _id: t._id, firstNameAr: t.firstNameAr, lastNameAr: t.lastNameAr, avatar: t.avatar, email: t.email }, hourlyRate: t.hourlyRate || 0 }
  }))
  return { rows, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

/** Every historical period for one teacher, newest first. */
async function listTeacherPeriods(teacherId, { page = 1, limit = 12 } = {}) {
  const filter = { teacherId }
  const skip = (page - 1) * limit
  const [periods, total] = await Promise.all([
    TeacherPayrollPeriod.find(filter).sort({ periodKey: -1 }).skip(skip).limit(limit),
    TeacherPayrollPeriod.countDocuments(filter),
  ])
  const rows = await Promise.all(periods.map(p => getPeriodWithTotals(p._id)))
  return { rows, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

module.exports = {
  PayrollPeriodError,
  getOrCreatePeriod, getOrCreateCurrentPeriod, computeLiveTotals, getPeriodWithTotals,
  submitForReview, approvePeriod, markPaid, reopenPeriod,
  listOrgPeriodsForMonth, listTeacherPeriods,
}

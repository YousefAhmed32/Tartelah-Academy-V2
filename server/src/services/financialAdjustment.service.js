// Teacher-side financial adjustments (Phase 2 §7) — bonuses, deductions/
// penalties, manual settlements, and reversals. Deliberately reuses
// TeacherPayrollEntry (the same ledger session pay already lives in) instead
// of a second, competing "adjustments" table — a teacher's net payable for a
// period is always one aggregation over one collection. Every row here is
// immutable once created; a correction is a new offsetting row
// (`reverseAdjustment`), never an edit in place.
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const User = require('../models/User')
const { getOrCreatePeriod, getOrCreateCurrentPeriod } = require('./payrollPeriod.service')

class FinancialAdjustmentError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

const ADJUSTMENT_TYPES = ['bonus', 'penalty', 'manual_adjustment']

/**
 * Records one teacher-side financial adjustment. `amount` is always given as
 * a positive magnitude by the caller (the UI never asks an admin to "enter a
 * negative number to deduct") — the sign is derived here from `type`:
 *   bonus              -> +amount (adds to net payable)
 *   penalty            -> -amount (a deduction/penalty)
 *   manual_adjustment  -> signed as given (a settlement/correction can go
 *                         either way — pass a negative `amount` for a debit)
 */
async function createTeacherAdjustment({ teacherId, type, amount, reason, year, month, createdBy }) {
  if (!ADJUSTMENT_TYPES.includes(type)) throw new FinancialAdjustmentError('نوع الحركة المالية غير صالح', 400, 'type')
  if (!reason?.trim()) throw new FinancialAdjustmentError('سبب الحركة المالية مطلوب', 400, 'reason')
  const rawAmount = Number(amount)
  if (!Number.isFinite(rawAmount) || rawAmount === 0) throw new FinancialAdjustmentError('قيمة الحركة المالية مطلوبة', 400, 'amount')
  const teacher = await User.findOne({ _id: teacherId, role: 'teacher' })
  if (!teacher) throw new FinancialAdjustmentError('المعلم غير موجود', 404, 'teacherId')

  const signedAmount = type === 'penalty' ? -Math.abs(rawAmount) : (type === 'bonus' ? Math.abs(rawAmount) : rawAmount)

  const period = (year && month) ? await getOrCreatePeriod(teacherId, year, month) : await getOrCreateCurrentPeriod(teacherId)
  if (['approved', 'paid'].includes(period.status)) {
    throw new FinancialAdjustmentError('هذه الفترة معتمدة أو مدفوعة بالفعل — أعد فتحها أولًا لإضافة حركة جديدة', 409, 'period')
  }

  const entry = await TeacherPayrollEntry.create({
    teacherId, type, amount: signedAmount, currency: 'EGP',
    reason: reason.trim(), businessRule: type === 'bonus' ? 'manual_bonus' : type === 'penalty' ? 'manual_penalty' : 'manual_settlement',
    createdBy, periodId: period._id, status: 'pending',
  })
  return { entry, period }
}

/**
 * Creates an offsetting entry that cancels out a previous adjustment.
 * Deliberately reversal-based, not void-based: the original row stays
 * ACTIVE (still counted) and a new entry of the exact opposite amount is
 * added alongside it — voiding the original here would double-cancel it
 * (the void already removes its contribution; subtracting it again on top
 * would net to twice the correction). `linkedEntryId` on the reversal
 * marks the pairing for display ("معكوسة ↔ …") without touching the
 * original's own immutable amount/status.
 */
async function reverseAdjustment(entryId, { reason, actorId }) {
  if (!reason?.trim()) throw new FinancialAdjustmentError('سبب العكس مطلوب', 400, 'reason')
  const original = await TeacherPayrollEntry.findById(entryId)
  if (!original) throw new FinancialAdjustmentError('الحركة غير موجودة', 404)
  if (!ADJUSTMENT_TYPES.includes(original.type)) throw new FinancialAdjustmentError('لا يمكن عكس حركة رواتب تلقائية بهذه الطريقة', 400)
  if (original.voided) throw new FinancialAdjustmentError('لا يمكن عكس حركة مُلغاة', 409)

  const reversal = await TeacherPayrollEntry.create({
    teacherId: original.teacherId, type: 'manual_adjustment', amount: -original.amount, currency: original.currency,
    reason: `عكس: ${original.reason || ''} — ${reason.trim()}`, businessRule: 'adjustment_reversal',
    createdBy: actorId, periodId: original.periodId, status: 'pending', supersedes: original._id,
  })
  original.supersededBy = reversal._id // display-only pairing link; original stays active/counted
  await original.save()
  return reversal
}

/** Paginated, filterable browser over one teacher's (or every teacher's) adjustment entries. */
async function listAdjustments({ teacherId, type, periodId, page = 1, limit = 20 } = {}) {
  const filter = { type: { $in: ADJUSTMENT_TYPES } }
  if (teacherId) filter.teacherId = teacherId
  if (type) filter.type = type
  if (periodId) filter.periodId = periodId
  const skip = (page - 1) * limit
  const [entries, total] = await Promise.all([
    TeacherPayrollEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('teacherId', 'firstNameAr lastNameAr avatar').populate('createdBy', 'firstNameAr lastNameAr'),
    TeacherPayrollEntry.countDocuments(filter),
  ])
  return { entries, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

module.exports = { FinancialAdjustmentError, createTeacherAdjustment, reverseAdjustment, listAdjustments, ADJUSTMENT_TYPES }

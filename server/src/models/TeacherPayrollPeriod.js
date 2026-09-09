const mongoose = require('mongoose')

// One document per teacher per calendar month (academy timezone) — the unit
// "review → approve → mark paid" actually operates on. Individual
// TeacherPayrollEntry rows (session pay + bonuses/deductions/settlements)
// reference a period via `periodId`; this document is a bounded, queryable
// rollup so the admin payroll screen never has to live-aggregate the whole
// ledger on every page load.
//
// Totals are LIVE (recomputed on read, cheap — one indexed aggregation
// scoped to this single teacher+period) while the period is still
// `open`/`pending_review`. The moment it is `approved`, the totals are
// frozen into this document (see `services/payrollPeriod.service.js`
// #approvePeriod) — a later correction to an underlying entry (a rare,
// explicitly-authorized action) never silently changes an already-approved
// number; it must go through `reopenPeriod` first, which is itself a
// tracked, reasoned, audited transition kept in `history` below.
const TeacherPayrollPeriodSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  periodKey: { type: String, required: true }, // `${year}-${String(month).padStart(2,'0')}`

  status: { type: String, enum: ['open', 'pending_review', 'approved', 'paid'], default: 'open' },

  // Frozen only once `status` leaves 'open'/'pending_review' — see doc-comment above.
  grossEntitlement: { type: Number, default: 0 },
  bonusesTotal: { type: Number, default: 0 },
  deductionsTotal: { type: Number, default: 0 },
  settlementsTotal: { type: Number, default: 0 },
  netPayable: { type: Number, default: 0 },
  sessionCount: { type: Number, default: 0 },
  payableSessionCount: { type: Number, default: 0 },
  currency: { type: String, default: 'EGP' },
  snapshotAt: { type: Date },

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt: { type: Date },
  paidReference: { type: String }, // free-text bank/transfer reference, admin-entered

  notes: { type: String },

  // Bounded append-only transition log (a handful of rows per period,
  // never unbounded) — the "complete adjustment/approval history" the
  // brief requires, instead of overwriting status transitions in place.
  history: [{
    action: { type: String, enum: ['submitted', 'approved', 'paid', 'reopened'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    reason: { type: String },
    snapshot: {
      grossEntitlement: Number, bonusesTotal: Number, deductionsTotal: Number,
      settlementsTotal: Number, netPayable: Number, sessionCount: Number, payableSessionCount: Number,
    },
    _id: false,
  }],
}, { timestamps: true })

TeacherPayrollPeriodSchema.index({ teacherId: 1, periodKey: 1 }, { unique: true })
TeacherPayrollPeriodSchema.index({ periodKey: 1, status: 1 })
TeacherPayrollPeriodSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('TeacherPayrollPeriod', TeacherPayrollPeriodSchema)

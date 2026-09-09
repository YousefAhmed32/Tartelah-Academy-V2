const mongoose = require('mongoose')

// Persisted payroll ledger — one entry per resolved session (unique sparse
// on sessionId while `voided: false`, so recording is idempotent/upsert-safe
// AND a corrected session can still get a fresh replacement entry — see
// `voided`/`supersedes` below). Replaces the old approach of computing
// `count x salaryPerSession` fresh on every request with no stored artifact:
// every payroll figure the admin/teacher dashboards show is now a query over
// real, auditable rows instead of a live recount.
//
// Canonical formula (hourly payroll, meeting-addendum follow-up):
//   amount = hourlyRateSnapshot * payableDurationMinutes / 60
// `rateSnapshot` (the old flat User.salaryPerSession at record time) is kept
// only as a legacy display mirror — it is never the source the amount is
// computed from once `hourlyRateSnapshot` is populated.
const TeacherPayrollEntrySchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },

  type: {
    type: String,
    enum: ['session_payable', 'session_non_payable', 'session_pending_review', 'bonus', 'penalty', 'manual_adjustment'],
    required: true,
  },
  amount: { type: Number, required: true, default: 0 }, // signed currency amount
  currency: { type: String, default: 'EGP' },

  // Hourly-payroll snapshot — frozen at the moment the session's payroll
  // status resolves. Never recomputed from the teacher's *current* rate.
  hourlyRateSnapshot: { type: Number, default: 0 },
  scheduledDurationMinutes: { type: Number },
  payableDurationMinutes: { type: Number },
  rateSnapshot: { type: Number, default: 0 }, // legacy mirror: salaryPerSession at record time

  // Machine-readable rule key (e.g. 'teacher_attended_full_session',
  // 'student_absent_teacher_present', 'teacher_no_show') alongside the
  // existing human-readable Arabic `reason` sentence — lets a UI/report
  // group or filter by rule without parsing Arabic text.
  businessRule: { type: String },
  reason: { type: String },

  status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'pending' },

  // Correction chain — an entry already approved/paid is NEVER edited or
  // silently recalculated in place (see payrollLedger.service.js#recordEntry).
  // Instead it is voided and a fresh entry created, linked both ways, so the
  // full history of what the amount used to be (and why it changed) stays
  // permanently readable rather than being overwritten.
  voided: { type: Boolean, default: false },
  voidedReason: { type: String },
  voidedAt: { type: Date },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPayrollEntry', default: null },
  supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPayrollEntry', default: null },

  // The monthly payroll period (academy timezone) this entry belongs to —
  // assigned at creation time so a period's rollup is a bounded, indexed
  // query rather than a live full-ledger scan.
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPayrollPeriod' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true })

TeacherPayrollEntrySchema.index({ teacherId: 1, createdAt: -1 })
TeacherPayrollEntrySchema.index({ teacherId: 1, status: 1 })
TeacherPayrollEntrySchema.index({ periodId: 1, voided: 1 })
TeacherPayrollEntrySchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $exists: true }, voided: false }, name: 'uniq_active_session_entry' }
)

module.exports = mongoose.model('TeacherPayrollEntry', TeacherPayrollEntrySchema)

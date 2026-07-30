const mongoose = require('mongoose')

// Persisted payroll ledger — one entry per resolved session (unique sparse
// on sessionId, so recording is idempotent/upsert-safe). Replaces the old
// approach of computing `count x salaryPerSession` fresh on every request
// with no stored artifact: every payroll figure the admin/teacher dashboards
// show is now a query over real, auditable rows instead of a live recount.
const TeacherPayrollEntrySchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },

  type: {
    type: String,
    enum: ['session_payable', 'session_non_payable', 'session_pending_review', 'bonus', 'penalty', 'manual_adjustment'],
    required: true,
  },
  amount: { type: Number, required: true, default: 0 }, // signed currency amount
  rateSnapshot: { type: Number, default: 0 },             // salaryPerSession at the time this entry was recorded
  status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'pending' },

  reason: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true })

TeacherPayrollEntrySchema.index({ teacherId: 1, createdAt: -1 })
TeacherPayrollEntrySchema.index({ teacherId: 1, status: 1 })
TeacherPayrollEntrySchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $exists: true } }, name: 'uniq_session_entry' }
)

module.exports = mongoose.model('TeacherPayrollEntry', TeacherPayrollEntrySchema)

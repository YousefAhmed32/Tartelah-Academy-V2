const mongoose = require('mongoose')

// A proposed adjustment has no balance effect until a manager decides it.
// The decision references exactly one canonical wallet/payroll ledger row.
const schema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supervisionTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionScheduledAt: { type: Date, required: true },
  accountType: { type: String, enum: ['teacher_payroll', 'student_lessons'], required: true },
  accountOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  unit: { type: String, enum: ['EGP', 'lesson'], required: true },
  requestedAmount: { type: Number, required: true, min: 0.01 },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'processing', 'approved', 'rejected', 'bonus'], default: 'pending' },
  decision: { type: String, enum: ['approve', 'reject', 'bonus'] },
  decidedAmount: { type: Number },
  decisionReason: { type: String, trim: true, maxlength: 1000 },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: { type: Date },
  ledgerEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPayrollEntry' },
  walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonTransaction' },
  processingError: { type: String },
}, { timestamps: true })

schema.index({ status: 1, createdAt: -1 })
schema.index({ teacherId: 1, createdAt: -1 })
schema.index({ sessionId: 1, createdAt: -1 })

module.exports = mongoose.model('SupervisionAdjustmentRequest', schema)

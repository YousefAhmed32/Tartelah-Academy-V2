const mongoose = require('mongoose')

// Permanent record of one active-student transfer between teachers (Phase 2
// meeting addendum §3). Distinct from AssignmentRequest (which governs a
// PENDING request's approval workflow before a student is ever active) —
// this is the operational record of moving an ALREADY-ACTIVE student's
// future ownership from one teacher to another; the two systems never
// overlap or write each other's rows. Also the canonical primitive batch
// teacher-replacement (TeacherReplacementBatch) builds on, one student at a
// time, rather than duplicating this logic.
const ScheduleChangeSchema = new mongoose.Schema({
  oldScheduleRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleRule' },
  newScheduleRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleRule' },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  oldTime: { type: String },
  newTime: { type: String }, // === oldTime when the slot was kept unchanged
  changed: { type: Boolean, default: false },
}, { _id: false })

const StudentTransferSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  oldTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  newTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  reason: { type: String, required: true, trim: true },
  effectiveDate: { type: Date, required: true },

  status: { type: String, enum: ['completed', 'failed', 'rolled_back'], default: 'completed' },
  failureReason: { type: String },

  scheduleChanges: { type: [ScheduleChangeSchema], default: [] },
  oldScheduleRuleIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'ScheduleRule', default: [] },
  newScheduleRuleIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'ScheduleRule', default: [] },
  cancelledSessionIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Session', default: [] },
  createdSessionIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Session', default: [] },

  walletBalanceAtTransfer: { type: Number },

  // Populated only when this transfer was executed as part of a bulk
  // whole-teacher replacement (Phase 2 addendum §4), linking back to it —
  // never the other way around (the batch is not the source of truth for
  // an individual transfer's data, this record is).
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherReplacementBatch', default: null },

  idempotencyKey: { type: String }, // e.g. `${studentId}:${batchId}` for batch-driven transfers
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

StudentTransferSchema.index({ studentId: 1, createdAt: -1 })
StudentTransferSchema.index({ oldTeacherId: 1, createdAt: -1 })
StudentTransferSchema.index({ newTeacherId: 1, createdAt: -1 })
StudentTransferSchema.index({ batchId: 1 })
StudentTransferSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
)

module.exports = mongoose.model('StudentTransfer', StudentTransferSchema)

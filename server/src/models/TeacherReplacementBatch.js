const mongoose = require('mongoose')

// Bulk whole-teacher-replacement batch record (Phase 2 meeting addendum §4)
// — e.g. a teacher leaving the academy. Each entry represents ONE student
// this batch will (or did) transfer; execution reuses transfer.service.js's
// single-student primitive per entry, never a separate parallel
// implementation. Kept as a single document (not one row per student) so
// the whole batch's progress/results are readable and auditable together —
// bounded processing/resumability is handled in the service layer by only
// (re)processing entries still in 'pending'/'failed' state.
const BatchEntrySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  // Computed at preview/creation time — see teacherReplacement.service.js.
  classification: {
    type: String,
    enum: ['ready', 'conflict', 'missing_data', 'excluded'],
    required: true,
  },
  classificationReason: { type: String }, // human-readable, e.g. which day conflicted / what data is missing
  // Every ScheduleRule this student needs a replacement slot for (computed
  // at preview/creation time) — lets runBatch require a resolution for EACH
  // one individually, rather than just checking resolvedSchedule is non-empty.
  conflictingRuleIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleRule' }], default: [] },

  selected: { type: Boolean, default: true }, // admin can deselect specific students before running
  // The final resolved schedule to apply for this student — required before
  // an entry classified 'conflict' can run; 'ready' entries default to
  // keeping their existing days/times (resolvedSchedule stays empty, meaning
  // "unchanged") unless the admin overrides it too. Each item may name a
  // `ruleId` for a per-rule decision (a student with multiple simultaneously-
  // conflicting rules can resolve each to a different alternative); an item
  // with no `ruleId` is a blanket decision applied to any rule left
  // unresolved — see teacherReplacement.service.js's setEntryResolution.
  resolvedSchedule: { type: [{ ruleId: mongoose.Schema.Types.ObjectId, dayOfWeek: Number, time: String, _id: false }], default: [] },

  result: { type: String, enum: ['pending', 'success', 'failed', 'skipped'], default: 'pending' },
  transferId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentTransfer', default: null },
  errorMessage: { type: String },
  processedAt: { type: Date },
}, { _id: false })

const TeacherReplacementBatchSchema = new mongoose.Schema({
  sourceTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, trim: true },
  effectiveDate: { type: Date, required: true },

  status: {
    type: String,
    enum: ['draft', 'running', 'completed', 'partial', 'failed', 'cancelled'],
    default: 'draft',
  },

  entries: { type: [BatchEntrySchema], default: [] },

  deactivateSourceTeacherOnSuccess: { type: Boolean, default: false },
  sourceTeacherDeactivated: { type: Boolean, default: false },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true })

TeacherReplacementBatchSchema.index({ sourceTeacherId: 1, createdAt: -1 })
TeacherReplacementBatchSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('TeacherReplacementBatch', TeacherReplacementBatchSchema)

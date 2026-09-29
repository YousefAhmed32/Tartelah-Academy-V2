const mongoose = require('mongoose')

const nomination = new mongoose.Schema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  evidence: { type: String, trim: true, maxlength: 1000 },
}, { _id: false })

const revision = new mongoose.Schema({
  at: { type: Date, required: true }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, note: { type: String, trim: true, maxlength: 1000 },
  previous: { type: mongoose.Schema.Types.Mixed },
}, { _id: false })

const schema = new mongoose.Schema({
  type: { type: String, enum: ['R3', 'R4'], required: true },
  team: { type: String, default: 'academic', immutable: true },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  periodStart: { type: Date, required: true }, periodEnd: { type: Date, required: true },
  timezone: { type: String, required: true },
  status: { type: String, enum: ['draft', 'submitted', 'changes_requested', 'approved'], default: 'draft' },
  scope: { type: mongoose.Schema.Types.Mixed, required: true },
  metricsSnapshot: { type: mongoose.Schema.Types.Mixed },
  sourceFingerprint: { type: String },
  shiftSnapshot: { type: mongoose.Schema.Types.Mixed },
  analysis: {
    distinguishedTeachers: { type: [nomination], default: [] }, teachersNeedingSupport: { type: [nomination], default: [] },
    distinguishedStudents: { type: [nomination], default: [] }, studentsNeedingSupport: { type: [nomination], default: [] },
    achievements: { type: String, trim: true, maxlength: 4000 },
    challenges: { type: String, trim: true, maxlength: 4000 },
    actions: { type: String, trim: true, maxlength: 4000 },
    recommendations: { type: String, trim: true, maxlength: 4000 },
    generalNotes: { type: String, trim: true, maxlength: 4000 },
    rating: { type: String, enum: ['excellent', 'very_good', 'good', 'needs_improvement'] },
    strength: { type: String, trim: true, maxlength: 2000 },
    improvement: { type: String, trim: true, maxlength: 2000 },
    nextGoal: { type: String, trim: true, maxlength: 2000 },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date }, reviewedAt: { type: Date }, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String, trim: true, maxlength: 1000 },
  version: { type: Number, default: 0 },
  revisions: { type: [revision], default: [] },
}, { timestamps: true, optimisticConcurrency: true })

schema.index({ type: 1, supervisorId: 1, periodStart: 1 }, { unique: true })
schema.index({ status: 1, periodStart: -1, supervisorId: 1 })
module.exports = mongoose.model('AcademicPeriodicReport', schema)

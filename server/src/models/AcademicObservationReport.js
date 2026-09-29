const mongoose = require('mongoose')

const revisionSchema = new mongoose.Schema({
  at: { type: Date, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  before: { type: mongoose.Schema.Types.Mixed },
  note: { type: String, maxlength: 1000 },
}, { _id: false })

const schema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionShift' },
  dueAt: { type: Date, required: true },
  observation: { type: String, enum: ['observed', 'not_observed'], required: true },
  observedAt: { type: Date },
  observationSource: { type: String, enum: ['manual_meeting', 'manual_other'], required: true },
  evidenceNote: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['draft', 'submitted', 'changes_requested', 'reviewed'], default: 'draft' },
  lessonFlow: { type: String, trim: true, maxlength: 2000 },
  studentLevel: { type: String, trim: true, maxlength: 2000 },
  teacherPerformance: { type: String, trim: true, maxlength: 2000 },
  observations: { type: String, trim: true, maxlength: 2000 },
  observationCategory: { type: String, enum: ['lesson_quality', 'teacher_commitment', 'student_progress', 'curriculum', 'attendance', 'technical', 'other'] },
  strengths: { type: String, trim: true, maxlength: 2000 },
  improvements: { type: String, trim: true, maxlength: 2000 },
  rating: { type: String, enum: ['excellent', 'very_good', 'good', 'needs_improvement'] },
  teacherGuidance: { type: String, trim: true, maxlength: 2000 },
  publishedTeacherGuidance: { type: String, trim: true, maxlength: 2000 },
  followUpNeeded: { type: Boolean, default: false },
  nextFollowUpPoint: { type: String, trim: true, maxlength: 2000 },
  closingNote: { type: String, trim: true, maxlength: 2000 },
  submittedAt: { type: Date },
  submissionVersion: { type: Number, default: 0 },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String, trim: true, maxlength: 1000 },
  teacherReply: { type: String, trim: true, maxlength: 2000 },
  teacherReplyStatus: { type: String, enum: ['pending', 'acknowledged', 'will_apply', 'applied', 'needs_discussion'] },
  teacherRepliedAt: { type: Date },
  teacherGuidanceVersion: { type: Number, default: 0 },
  nextSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  revisions: { type: [revisionSchema], default: [] },
}, { timestamps: true })

schema.index({ sessionId: 1, supervisorId: 1 }, { unique: true })
schema.index({ supervisorId: 1, scheduledAt: -1 })
schema.index({ status: 1, dueAt: 1 })
schema.index({ teacherId: 1, status: 1, submittedAt: -1 })
schema.index({ shiftId: 1, observation: 1 })
schema.index({ studentId: 1, scheduledAt: -1 })

module.exports = mongoose.model('AcademicObservationReport', schema)

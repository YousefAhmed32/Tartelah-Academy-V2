const mongoose = require('mongoose')

// Operational record only. Session, LessonTransaction and TeacherPayrollEntry
// remain the sources of truth for appointments, lesson credit and money.
const schema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  parentCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionException' },
  autoKey: { type: String },
  originalTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionScheduledAt: { type: Date, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['student_apology', 'teacher_apology', 'student_absence', 'teacher_absence', 'delay', 'postpone', 'advance', 'reschedule', 'link_issue', 'substitute', 'compensation', 'other'], required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  followUpAt: { type: Date, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  action: { type: String, enum: ['none', 'reschedule', 'cancel', 'substitute', 'update_link', 'report_delay', 'grant_compensation', 'schedule_makeup'], default: 'none' },
  actionState: { type: String, enum: ['none', 'processing', 'applied', 'failed'], default: 'none' },
  actionPayload: { type: mongoose.Schema.Types.Mixed },
  actionResult: { type: mongoose.Schema.Types.Mixed },
  actionError: { type: String },
  actionAt: { type: Date },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  makeupSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  resolution: { type: String, trim: true, maxlength: 1000 },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

schema.index({ ownerId: 1, status: 1, followUpAt: 1 })
schema.index({ status: 1, followUpAt: 1 })
schema.index({ sessionId: 1, createdAt: -1 })
schema.index({ parentCaseId: 1 }, { unique: true, partialFilterExpression: { parentCaseId: { $exists: true } }, name: 'uniq_compensation_followup' })
schema.index({ autoKey: 1 }, { unique: true, partialFilterExpression: { autoKey: { $exists: true } }, name: 'uniq_auto_exception' })
schema.index({ originalTeacherId: 1, sessionScheduledAt: 1, status: 1 })
schema.index({ currentTeacherId: 1, sessionScheduledAt: 1, status: 1 })

module.exports = mongoose.model('SupervisionException', schema)

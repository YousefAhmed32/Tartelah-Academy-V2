const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

// Dated supervision responsibility. Legacy rows without scopeType are teacher
// assignments. Student assignments apply to one teacher/student relationship;
// cohort assignments use the separately dated cohort membership records.
const SupervisionAssignmentSchema = new mongoose.Schema({
  team: { type: String, enum: SUPERVISION_TEAMS, required: true },
  scopeType: { type: String, enum: ['teacher', 'student', 'cohort'], default: 'teacher' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionCohort' },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date },
  primary: { type: Boolean, default: true },
  reason: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionAssignment' },
}, { timestamps: true })

SupervisionAssignmentSchema.pre('validate', function validateScope(next) {
  const valid = this.scopeType === 'teacher' ? !!this.teacherId && !this.studentId && !this.cohortId
    : this.scopeType === 'student' ? !!this.teacherId && !!this.studentId && !this.cohortId
      : !!this.cohortId && !this.teacherId && !this.studentId
  if (!valid) this.invalidate('scopeType', 'نطاق تكليف الإشراف غير صالح')
  next()
})

SupervisionAssignmentSchema.index({ team: 1, teacherId: 1, primary: 1, startsAt: 1, endsAt: 1 })
SupervisionAssignmentSchema.index({ team: 1, scopeType: 1, teacherId: 1, studentId: 1, startsAt: 1, endsAt: 1 })
SupervisionAssignmentSchema.index({ team: 1, scopeType: 1, cohortId: 1, startsAt: 1, endsAt: 1 })
SupervisionAssignmentSchema.index({ supervisorId: 1, startsAt: 1, endsAt: 1 })

module.exports = mongoose.model('SupervisionAssignment', SupervisionAssignmentSchema)

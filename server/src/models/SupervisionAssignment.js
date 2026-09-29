const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

// A dated teacher cohort. The students are resolved from the teacher's real
// schedules/sessions, so a second student roster cannot drift out of sync.
const SupervisionAssignmentSchema = new mongoose.Schema({
  team: { type: String, enum: SUPERVISION_TEAMS, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date },
  primary: { type: Boolean, default: true },
  reason: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionAssignment' },
}, { timestamps: true })

SupervisionAssignmentSchema.index({ team: 1, teacherId: 1, primary: 1, startsAt: 1, endsAt: 1 })
SupervisionAssignmentSchema.index({ supervisorId: 1, startsAt: 1, endsAt: 1 })

module.exports = mongoose.model('SupervisionAssignment', SupervisionAssignmentSchema)

const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

const schema = new mongoose.Schema({
  team: { type: String, enum: SUPERVISION_TEAMS, required: true },
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionCohort', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

// A student can be in only one active group for each supervision team.
schema.index({ team: 1, studentId: 1 }, { unique: true, partialFilterExpression: { endsAt: null } })
schema.index({ cohortId: 1, startsAt: 1, endsAt: 1 })
module.exports = mongoose.model('SupervisionCohortMember', schema)

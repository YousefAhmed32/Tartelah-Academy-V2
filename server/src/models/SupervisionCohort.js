const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

const schema = new mongoose.Schema({
  team: { type: String, enum: SUPERVISION_TEAMS, required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  notes: { type: String, trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

schema.index({ team: 1, isActive: 1, name: 1 })
module.exports = mongoose.model('SupervisionCohort', schema)

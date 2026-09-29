const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

const SupervisionShiftSchema = new mongoose.Schema({
  team: { type: String, enum: SUPERVISION_TEAMS, required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  timezone: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

SupervisionShiftSchema.index({ team: 1, startsAt: 1, endsAt: 1 })
SupervisionShiftSchema.index({ members: 1, startsAt: 1, endsAt: 1 })

module.exports = mongoose.model('SupervisionShift', SupervisionShiftSchema)

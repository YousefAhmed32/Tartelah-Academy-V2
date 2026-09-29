const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

const SupervisionSettingsSchema = new mongoose.Schema({
  team: { type: String, enum: SUPERVISION_TEAMS, required: true, unique: true },
  notificationRecipients: { type: [String], enum: ['manager', 'supervisor', 'admin'], default: ['manager', 'supervisor'] },
  reportGraceMinutes: { type: Number, min: 0, max: 1440, default: 120 },
  escalateAfterMinutes: { type: Number, min: 0, max: 1440, default: 0 },
  priorityCategories: { type: [String], default: [] },
  effectiveAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('SupervisionSettings', SupervisionSettingsSchema)

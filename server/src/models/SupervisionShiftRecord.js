const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

// One attendance and handoff record per person per dated shift. The canonical
// sessions and follow-up cases remain live; reportSnapshot freezes R2 at send.
const schema = new mongoose.Schema({
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionShift', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: String, enum: SUPERVISION_TEAMS, required: true },
  checkedInAt: { type: Date },
  checkedOutAt: { type: Date },
  handedOffAt: { type: Date },
  handoffNote: { type: String, trim: true, maxlength: 2000 },
  analysis: { type: String, trim: true, maxlength: 4000 },
  reportSubmittedAt: { type: Date },
  reportDueAt: { type: Date },
  reportSnapshot: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

schema.index({ shiftId: 1, memberId: 1 }, { unique: true })
schema.index({ team: 1, reportSubmittedAt: 1, updatedAt: -1 })
schema.index({ team: 1, handedOffAt: -1 })
schema.index({ memberId: 1, updatedAt: -1 })

module.exports = mongoose.model('SupervisionShiftRecord', schema)

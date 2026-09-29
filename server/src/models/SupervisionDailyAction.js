const mongoose = require('mongoose')
const { SUPERVISION_TEAMS } = require('../config/permissions')

// A small operational follow-up tied to the canonical Session. Scheduling and
// attendance remain on Session; this only records the human action needed.
const schema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  team: { type: String, enum: SUPERVISION_TEAMS, required: true },
  category: { type: String, enum: ['readiness', 'entry', 'link', 'message', 'teacher_report', 'academic_guidance'], required: true },
  sourceAcademicReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicObservationReport' },
  description: { type: String, trim: true, required: true, maxlength: 1000 },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolution: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true })

schema.index({ sessionId: 1, status: 1, createdAt: -1 })
schema.index({ team: 1, ownerId: 1, status: 1, createdAt: -1 })
schema.index({ sourceAcademicReportId: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('SupervisionDailyAction', schema)

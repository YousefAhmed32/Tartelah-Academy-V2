const mongoose = require('mongoose')

// Additive follow-up on the existing student/session/schedule lifecycle.
// Group setup and teacher onboarding remain outside this record.
const schema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  firstSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 1500 },
  feedbackAt: { type: Date },
  stabilizedAt: { type: Date },
  stabilizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stabilizationNote: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true })

schema.index({ firstSessionId: 1 })
schema.index({ feedbackAt: -1 })

module.exports = mongoose.model('StudentStartFollowup', schema)

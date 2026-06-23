const mongoose = require('mongoose')

const EvaluationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  type: { type: String, enum: ['tajweed', 'hifz', 'nazra', 'behavior', 'general'], default: 'general' },
  score: { type: Number, required: true, min: 1, max: 10 },
  notesAr: { type: String },
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  isSharedWithStudent: { type: Boolean, default: true },
}, { timestamps: true })

EvaluationSchema.index({ studentId: 1, createdAt: -1 })
EvaluationSchema.index({ teacherId: 1, createdAt: -1 })
EvaluationSchema.index({ studentId: 1, type: 1 })

module.exports = mongoose.model('Evaluation', EvaluationSchema)

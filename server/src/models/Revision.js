const mongoose = require('mongoose')

const RevisionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  surahNumber: { type: Number, required: true, min: 1, max: 114 },
  fromAyah: { type: Number, required: true, min: 1 },
  toAyah: { type: Number, required: true, min: 1 },
  quality: { type: String, enum: ['excellent', 'good', 'fair', 'weak'], default: 'good' },
  teacherNotes: { type: String },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true })

RevisionSchema.index({ studentId: 1, surahNumber: 1 })
RevisionSchema.index({ teacherId: 1, recordedAt: -1 })

module.exports = mongoose.model('Revision', RevisionSchema)

const mongoose = require('mongoose')

const AttendanceSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused', 'left_early', 'technical_issue'], default: 'present' },
  notes: { type: String },
  recordedAt: { type: Date, default: Date.now },
  arrivalTime: { type: Date },
  isFinalized: { type: Boolean, default: false },
  finalizedAt: { type: Date },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

AttendanceSchema.index({ studentId: 1, recordedAt: -1 })
AttendanceSchema.index({ teacherId: 1, recordedAt: -1 })
AttendanceSchema.index({ sessionId: 1 }, { unique: true })

module.exports = mongoose.model('Attendance', AttendanceSchema)

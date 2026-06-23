const mongoose = require('mongoose')

const EnrollmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
}, { timestamps: true })

EnrollmentSchema.index({ studentId: 1, status: 1 })
EnrollmentSchema.index({ courseId: 1, status: 1 })
EnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true })

module.exports = mongoose.model('Enrollment', EnrollmentSchema)

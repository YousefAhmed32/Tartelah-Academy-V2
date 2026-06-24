const mongoose = require('mongoose')

const SessionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleRule' },
  titleAr: { type: String, required: true, trim: true },
  title: { type: String, trim: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'rescheduled', 'missed', 'no_show'],
    default: 'scheduled',
  },
  meetingLink: { type: String, trim: true },
  meetingProvider: { type: String, enum: ['zoom', 'meet', 'teams', 'other', 'custom'], default: 'zoom' },
  notes: { type: String },
  teacherNotes: { type: String },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  isException: { type: Boolean, default: false },
  isMakeup: { type: Boolean, default: false },
  rescheduledFrom: { type: Date },
}, { timestamps: true })

SessionSchema.index({ studentId: 1, scheduledAt: -1 })
SessionSchema.index({ teacherId: 1, scheduledAt: -1 })
SessionSchema.index({ scheduledAt: 1, status: 1 })
SessionSchema.index({ status: 1, createdAt: -1 })
SessionSchema.index({ seriesId: 1, scheduledAt: 1 })

module.exports = mongoose.model('Session', SessionSchema)

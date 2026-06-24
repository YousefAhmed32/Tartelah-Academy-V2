const mongoose = require('mongoose')

const ScheduleRuleSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom'],
    default: 'weekly',
  },
  daysOfWeek: [{ type: Number, min: 0, max: 6 }],
  timeOfDay: { type: String, default: '18:00' },
  durationMinutes: { type: Number, default: 60 },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  sessionsTotal: { type: Number },
  meetingLink: { type: String },
  meetingProvider: {
    type: String,
    enum: ['zoom', 'meet', 'teams', 'other', 'custom'],
    default: 'zoom',
  },
  titleTemplate: { type: String, default: 'حصة' },
  status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
  skipDates: [{ type: Date }],
  timezone: { type: String, default: 'Asia/Riyadh' },
  notes: { type: String },
}, { timestamps: true })

ScheduleRuleSchema.index({ teacherId: 1, status: 1 })
ScheduleRuleSchema.index({ studentId: 1, status: 1 })
ScheduleRuleSchema.index({ teacherId: 1, studentId: 1 })

module.exports = mongoose.model('ScheduleRule', ScheduleRuleSchema)

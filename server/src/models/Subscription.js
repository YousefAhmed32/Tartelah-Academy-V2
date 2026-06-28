const mongoose = require('mongoose')

const SubscriptionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled', 'paused'], default: 'active' },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  sessionsRemaining: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

SubscriptionSchema.index({ studentId: 1, status: 1 })
SubscriptionSchema.index({ teacherId: 1, status: 1 })
SubscriptionSchema.index({ endDate: 1, status: 1 })
SubscriptionSchema.pre('save', function (next) {
  if (this.isNew && !this.endDate) {
    const startMs = (this.startDate || new Date()).getTime()
    const days = this.totalSessions ? Math.ceil(this.totalSessions / 4) * 7 : 30
    this.endDate = new Date(startMs + days * 24 * 60 * 60 * 1000)
  }
  // Never let sessionsRemaining go negative
  if (this.sessionsRemaining < 0) this.sessionsRemaining = 0
  next()
})

module.exports = mongoose.model('Subscription', SubscriptionSchema)

const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  titleAr: { type: String, required: true },
  title: { type: String },
  bodyAr: { type: String },
  body: { type: String },
  type: { type: String, enum: ['session', 'homework', 'evaluation', 'subscription', 'enrollment', 'system'], default: 'system' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  data: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', NotificationSchema)

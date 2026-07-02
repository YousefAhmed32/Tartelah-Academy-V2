const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  titleAr:   { type: String, required: true },
  title:     { type: String },
  bodyAr:    { type: String },
  body:      { type: String },
  type:      { type: String, enum: ['session', 'homework', 'evaluation', 'subscription', 'enrollment', 'payment', 'schedule', 'system', 'attendance'], default: 'system' },
  priority:  { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  isRead:    { type: Boolean, default: false },
  readAt:    { type: Date },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  actionUrl: { type: String },
  metadata:  { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', NotificationSchema)

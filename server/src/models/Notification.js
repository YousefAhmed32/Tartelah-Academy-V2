const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  titleAr:   { type: String, required: true },
  title:     { type: String },
  bodyAr:    { type: String },
  body:      { type: String },
  type:      { type: String, enum: ['session', 'homework', 'evaluation', 'subscription', 'enrollment', 'payment', 'schedule', 'system', 'attendance', 'assignment', 'payroll', 'renewal', 'report', 'survey'], default: 'system' },
  priority:  { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  isRead:    { type: Boolean, default: false },
  readAt:    { type: Date },
  isArchived:  { type: Boolean, default: false },
  archivedAt:  { type: Date },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  // Human-readable label for what `relatedId` actually points at (e.g.
  // "Session", "AssignmentRequest") — additive, optional. Older documents
  // without it remain valid; the frontend falls back to `type` for display.
  entityType: { type: String },
  actionUrl: { type: String },
  metadata:  { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

NotificationSchema.index({ userId: 1, isRead: 1, isArchived: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, isArchived: 1, createdAt: -1 })
// Reminder delivery must be atomic across overlapping cron ticks and server
// instances. This applies only to new V3 reminder keys, not legacy rows.
NotificationSchema.index({ userId: 1, 'metadata.reminderKey': 1 }, {
  unique: true,
  partialFilterExpression: { 'metadata.reminderKey': { $type: 'string' } },
})

module.exports = mongoose.model('Notification', NotificationSchema)

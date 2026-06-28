const mongoose = require('mongoose')

const AuditLogSchema = new mongoose.Schema({
  actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, required: true },
  action:    { type: String, required: true },
  entity:    { type: String, required: true },
  entityId:  { type: mongoose.Schema.Types.ObjectId },
  changes:   { type: mongoose.Schema.Types.Mixed },
  meta:      { type: mongoose.Schema.Types.Mixed },
  ip:        { type: String },
}, { timestamps: true })

AuditLogSchema.index({ actorId: 1, createdAt: -1 })
AuditLogSchema.index({ entity: 1, entityId: 1 })
AuditLogSchema.index({ createdAt: -1 })

AuditLogSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('AuditLog', AuditLogSchema)

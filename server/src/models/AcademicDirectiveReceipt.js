const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  directiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicDirective', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'acknowledged', 'will_apply', 'applied', 'needs_discussion'], default: 'pending' },
  reply: { type: String, trim: true, maxlength: 2000 },
  respondedAt: { type: Date },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

schema.index({ directiveId: 1, recipientId: 1 }, { unique: true })
schema.index({ recipientId: 1, createdAt: -1 })
schema.index({ directiveId: 1, status: 1 })
module.exports = mongoose.model('AcademicDirectiveReceipt', schema)

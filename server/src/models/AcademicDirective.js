const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 3000 },
  materialUrl: { type: String, trim: true, maxlength: 1000 },
  targetType: { type: String, enum: ['person', 'category', 'all'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  categoryKey: { type: String, trim: true },
  recipientCount: { type: Number, required: true, min: 1 },
}, { timestamps: true })

schema.index({ createdAt: -1, _id: -1 })
module.exports = mongoose.model('AcademicDirective', schema)

const mongoose = require('mongoose')

const FAQSchema = new mongoose.Schema({
  questionAr: { type: String, required: true },
  answerAr: { type: String, required: true },
  category: { type: String, default: 'general' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('FAQ', FAQSchema)

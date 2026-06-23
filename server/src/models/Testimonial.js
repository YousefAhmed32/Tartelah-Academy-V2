const mongoose = require('mongoose')

const TestimonialSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  roleAr: { type: String },
  bodyAr: { type: String, required: true },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  avatarUrl: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Testimonial', TestimonialSchema)

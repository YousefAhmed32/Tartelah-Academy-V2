const mongoose = require('mongoose')

const PackageSchema = new mongoose.Schema({
  nameAr: { type: String, required: true, trim: true },
  name: { type: String, trim: true },
  descriptionAr: { type: String },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'SAR' },
  durationDays: { type: Number, required: true, default: 30 },
  sessionsPerMonth: { type: Number, required: true, default: 8 },
  featuresAr: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

PackageSchema.index({ isActive: 1, sortOrder: 1 })

module.exports = mongoose.model('Package', PackageSchema)

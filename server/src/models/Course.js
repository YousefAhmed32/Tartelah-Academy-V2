const mongoose = require('mongoose')

const CourseSchema = new mongoose.Schema({
  nameAr: { type: String, required: true, trim: true },
  name: { type: String, trim: true },
  descriptionAr: { type: String },
  description: { type: String },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  ageGroup: { type: String, enum: ['children', 'teens', 'adults'], default: 'adults' },
  durationWeeks: { type: Number, default: 12 },
  syllabusAr: [{ type: String }],
  isActive: { type: Boolean, default: true },
  enrollmentCount: { type: Number, default: 0 },
}, { timestamps: true })

CourseSchema.index({ level: 1, ageGroup: 1 })
CourseSchema.index({ isActive: 1 })

module.exports = mongoose.model('Course', CourseSchema)

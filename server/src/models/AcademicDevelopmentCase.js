const mongoose = require('mongoose')

const update = new mongoose.Schema({
  at: { type: Date, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'improving', 'improved'], required: true },
  outcome: { type: String, trim: true, maxlength: 1000 },
}, { _id: false })

const schema = new mongoose.Schema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  personType: { type: String, enum: ['teacher', 'supervisor'], required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  strengths: { type: String, trim: true, maxlength: 1000 },
  improvement: { type: String, required: true, trim: true, maxlength: 1000 },
  nextAction: { type: String, required: true, trim: true, maxlength: 1000 },
  sourceObservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicObservationReport' },
  status: { type: String, enum: ['open', 'improving', 'improved'], default: 'open' },
  outcome: { type: String, trim: true, maxlength: 1000 },
  history: { type: [update], default: [] },
}, { timestamps: true, optimisticConcurrency: true })

schema.index({ personId: 1, updatedAt: -1 })
schema.index({ status: 1, updatedAt: -1 })
module.exports = mongoose.model('AcademicDevelopmentCase', schema)

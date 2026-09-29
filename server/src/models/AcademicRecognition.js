const mongoose = require('mongoose')

const pick = new mongoose.Schema({
  personId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicPeriodicReport', required: true },
  sourceVersion: { type: Number, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
}, { _id: false })
const schema = new mongoose.Schema({
  periodStart: { type: Date, required: true, unique: true },
  periodEnd: { type: Date, required: true }, timezone: { type: String, required: true },
  students: { type: [pick], default: [] },
  maleTeacher: { type: pick }, femaleTeacher: { type: pick },
  note: { type: String, trim: true, maxlength: 2000 },
  selectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  selectedAt: { type: Date, required: true }, version: { type: Number, default: 1 },
  revisions: { type: [new mongoose.Schema({ at: Date, by: mongoose.Schema.Types.ObjectId, previous: mongoose.Schema.Types.Mixed,
    note: { type: String, maxlength: 1000 } }, { _id: false })], default: [] },
}, { timestamps: true, optimisticConcurrency: true })
module.exports = mongoose.model('AcademicRecognition', schema)

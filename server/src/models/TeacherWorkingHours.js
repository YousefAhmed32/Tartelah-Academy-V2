const mongoose = require('mongoose')
const { DAYS_OF_WEEK, WORKING_HOUR_MODES } = require('../config/workingHours')

// One document per teacher — the admin-configured weekly working-hours
// template (see config/workingHours.js for the validation rules and the
// design note on why "breaks" are represented as gaps between `periods`
// rather than a separate array). This is storage + validation only for
// Part 1; the automatic free-slot computation against booked sessions is a
// Part 2 concern (the "availability engine").
const PeriodSchema = new mongoose.Schema({
  start: { type: String, required: true }, // 'HH:mm', 24h
  end: { type: String, required: true },
}, { _id: false })

const DayScheduleSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday..6=Saturday, matches ScheduleRule.daysOfWeek
  mode: { type: String, enum: WORKING_HOUR_MODES, default: 'unavailable' },
  // Only populated when mode === 'custom'. Ignored/must-be-empty otherwise
  // (enforced by validateWorkingHoursDays).
  periods: { type: [PeriodSchema], default: [] },
}, { _id: false })

const TeacherWorkingHoursSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // null = inherit the academy-wide default (AcademySettings.timezone, see
  // services/academySettings.service.js). Only set here if a teacher's
  // working hours must ever differ from the academy default.
  timezone: { type: String, default: null },
  days: {
    type: [DayScheduleSchema],
    default: () => DAYS_OF_WEEK.map((dayOfWeek) => ({ dayOfWeek, mode: 'unavailable', periods: [] })),
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('TeacherWorkingHours', TeacherWorkingHoursSchema)

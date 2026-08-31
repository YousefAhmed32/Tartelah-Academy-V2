const AcademySettings = require('../models/AcademySettings')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

/**
 * Resolves the academy-wide timezone — the single place every time-of-day
 * feature (teacher working hours, and the future automatic availability
 * engine) reads it from, instead of a hardcoded string scattered around the
 * codebase. Falls back to the documented default when no settings document
 * exists yet or its timezone field is empty.
 */
async function getAcademyTimezone() {
  const settings = await AcademySettings.findOne().select('timezone')
  return settings?.timezone || DEFAULT_ACADEMY_TIMEZONE
}

/**
 * Resolves both the academy timezone and the configured inter-lesson buffer
 * in one query — used by the availability engine (services/availability.service.js)
 * so it never needs two round-trips just to read two settings fields.
 */
async function getAcademySchedulingSettings() {
  const settings = await AcademySettings.findOne().select('timezone lessonBufferMinutes')
  return {
    timezone: settings?.timezone || DEFAULT_ACADEMY_TIMEZONE,
    lessonBufferMinutes: Number.isFinite(settings?.lessonBufferMinutes) ? settings.lessonBufferMinutes : 0,
  }
}

module.exports = { getAcademyTimezone, getAcademySchedulingSettings }

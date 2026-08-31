// Single source of truth for the academy's configured timezone default.
// Per the Phase 2 Part 1 brief: no academy-wide timezone setting existed
// before this — ScheduleRule.timezone (per-rule, defaults 'Asia/Riyadh') is
// a separate, older, per-record field and is left untouched. This is the
// NEW admin-configurable academy-wide default, read via
// services/academySettings.service.js#getAcademyTimezone(), consumed by
// TeacherWorkingHours and (in a later phase) the availability engine.
// Never hardcode a timezone string anywhere else — always resolve it here.
const DEFAULT_ACADEMY_TIMEZONE = 'Africa/Cairo'

function isValidTimezone(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    // Throws RangeError for an unrecognized IANA zone name.
    Intl.DateTimeFormat(undefined, { timeZone: value })
    return true
  } catch {
    return false
  }
}

module.exports = { DEFAULT_ACADEMY_TIMEZONE, isValidTimezone }

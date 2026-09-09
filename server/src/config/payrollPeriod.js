const { toZonedTime } = require('date-fns-tz')

// Resolves which academy-timezone calendar month a given instant falls in —
// the single place every payroll-period boundary decision goes through, so
// "which month does this session belong to" is never computed ad hoc with
// server-local time (which may differ from the academy's configured
// timezone) in more than one place. Mirrors the pattern already established
// by services/academySettings.service.js#getAcademyTimezone.
function getYearMonthInTimezone(date, timezone) {
  const zoned = toZonedTime(date instanceof Date ? date : new Date(date), timezone)
  return { year: zoned.getFullYear(), month: zoned.getMonth() + 1 } // month: 1-12
}

function buildPeriodKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getPeriodKeyForDate(date, timezone) {
  const { year, month } = getYearMonthInTimezone(date, timezone)
  return { year, month, periodKey: buildPeriodKey(year, month) }
}

module.exports = { getYearMonthInTimezone, buildPeriodKey, getPeriodKeyForDate }

const { fromZonedTime, formatInTimeZone } = require('date-fns-tz')
const { DEFAULT_ACADEMY_TIMEZONE, isValidTimezone } = require('../config/academyTimezone')

const LOCAL_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/

function resolveTimezone(timezone) {
  return isValidTimezone(timezone) ? timezone : DEFAULT_ACADEMY_TIMEZONE
}

/**
 * Parses browser `datetime-local` values as academy wall-clock time. Values
 * already carrying `Z` or an explicit offset remain absolute instants.
 */
function parseAcademyDateTime(value, timezone) {
  if (value instanceof Date) return new Date(value)
  if (typeof value === 'string' && LOCAL_DATE_TIME_RE.test(value)) {
    return fromZonedTime(value.replace('T', ' '), resolveTimezone(timezone))
  }
  return new Date(value)
}

function formatAcademyDateTimeAr(value, timezone) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn-ca-gregory', {
    timeZone: resolveTimezone(timezone),
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date)
}

function academyMonthBounds(year, month, timezone) {
  const tz = resolveTimezone(timezone)
  const y = Number(year)
  const m = Number(month)
  const nextYear = m === 12 ? y + 1 : y
  const nextMonth = m === 12 ? 1 : m + 1
  const pad = (number) => String(number).padStart(2, '0')
  const start = fromZonedTime(`${y}-${pad(m)}-01 00:00:00`, tz)
  const next = fromZonedTime(`${nextYear}-${pad(nextMonth)}-01 00:00:00`, tz)
  return { start, end: new Date(next.getTime() - 1), timezone: tz }
}

function academyDayBounds(value = new Date(), timezone) {
  const tz = resolveTimezone(timezone)
  const key = academyDateKey(value, tz)
  const [year, month, day] = key.split('-').map(Number)
  const nextKey = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  return {
    start: fromZonedTime(`${key} 00:00:00`, tz),
    end: fromZonedTime(`${nextKey} 00:00:00`, tz),
    timezone: tz,
  }
}

function academyDateKeyBounds(dateKey, timezone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return null
  const tz = resolveTimezone(timezone)
  const [year, month, day] = dateKey.split('-').map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null
  const nextKey = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  return {
    start: fromZonedTime(`${dateKey} 00:00:00`, tz),
    end: fromZonedTime(`${nextKey} 00:00:00`, tz),
    timezone: tz,
  }
}

function academyDateKey(value, timezone) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatInTimeZone(date, resolveTimezone(timezone), 'yyyy-MM-dd')
}

module.exports = {
  academyDateKey,
  academyDateKeyBounds,
  academyDayBounds,
  academyMonthBounds,
  formatAcademyDateTimeAr,
  parseAcademyDateTime,
  resolveTimezone,
}

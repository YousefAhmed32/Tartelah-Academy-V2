const DEFAULT_ACADEMY_TIMEZONE = 'Africa/Cairo'
const ARABIC_GREGORIAN_LOCALE = 'ar-EG-u-nu-latn-ca-gregory'

let academyTimezone = DEFAULT_ACADEMY_TIMEZONE

function isValidTimezone(value) {
  if (!value) return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

/** Session timestamps are UTC instants, but every user sees academy time. */
export function setAcademyTimezone(value) {
  academyTimezone = isValidTimezone(value) ? value : DEFAULT_ACADEMY_TIMEZONE
  return academyTimezone
}

export function getAcademyTimezone() {
  return academyTimezone
}

export function getAcademyTimezoneLabel(value = academyTimezone) {
  const labels = {
    'Africa/Cairo': 'القاهرة',
    'Asia/Riyadh': 'الرياض',
    'Asia/Kuwait': 'الكويت',
    'Asia/Dubai': 'الإمارات',
    'Asia/Amman': 'عمّان',
    'Asia/Baghdad': 'بغداد',
    UTC: 'UTC',
  }
  return labels[value] || value
}

function safeDate(date) {
  if (!date) return null
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatter(options) {
  return new Intl.DateTimeFormat(ARABIC_GREGORIAN_LOCALE, {
    timeZone: academyTimezone,
    ...options,
  })
}

export function formatDateAr(date) {
  const parsed = safeDate(date)
  if (!parsed) return ''
  return formatter({ year: 'numeric', month: 'long', day: 'numeric' }).format(parsed)
}

/** Formats a YYYY-MM-DD form value without applying any timezone shift. */
export function formatDateKeyAr(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return ''
  return new Intl.DateTimeFormat(ARABIC_GREGORIAN_LOCALE, {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(new Date(`${dateKey}T12:00:00.000Z`))
}

export function formatDateTimeAr(date) {
  const parsed = safeDate(date)
  if (!parsed) return ''
  return formatter({
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(parsed)
}

export function formatTimeAr(date) {
  const parsed = safeDate(date)
  if (!parsed) return ''
  return formatter({ hour: '2-digit', minute: '2-digit', hour12: true }).format(parsed)
}

/** YYYY-MM-DD for grouping/comparison in academy time (not browser time). */
export function academyDateKey(date) {
  const parsed = safeDate(date)
  if (!parsed) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: academyTimezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(parsed)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

/** Adds calendar days to a YYYY-MM-DD value without involving local time. */
export function shiftDateKey(dateKey, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return ''
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + Number(days || 0))).toISOString().slice(0, 10)
}

export function academyMonthDateRange(date = new Date()) {
  const key = academyDateKey(date)
  if (!key) return { start: '', end: '' }
  const [year, month] = key.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  return { start, end }
}

export function getAcademyWeekdayIndex(date) {
  const key = academyDateKey(date)
  return key ? new Date(`${key}T12:00:00.000Z`).getUTCDay() : null
}

/** Value suitable for datetime-local, rendered in the academy timezone. */
export function toAcademyDateTimeLocal(date) {
  const parsed = safeDate(date)
  if (!parsed) return ''
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: academyTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(parsed)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}`
}

export function isToday(date) {
  return academyDateKey(date) === academyDateKey(new Date())
}

export function isFuture(date) {
  return new Date(date) > new Date()
}

export function isPast(date) {
  return new Date(date) < new Date()
}

export function timeFromNow(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = d - now
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)
  const past = diff < 0

  if (mins < 1) return 'الآن'
  if (mins < 60) return past ? `منذ ${mins} دقيقة` : `خلال ${mins} دقيقة`
  if (hours < 24) return past ? `منذ ${hours} ساعة` : `خلال ${hours} ساعة`
  return past ? `منذ ${days} يوم` : `خلال ${days} يوم`
}

export function getDayNameAr(date) {
  const parsed = safeDate(date)
  if (!parsed) return ''
  return formatter({ weekday: 'long' }).format(parsed)
}

export function formatShortDate(date) {
  const parsed = safeDate(date)
  if (!parsed) return ''
  return formatter({ month: 'short', day: 'numeric' }).format(parsed)
}

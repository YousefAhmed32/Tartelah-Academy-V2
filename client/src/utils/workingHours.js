// Client twin of server/src/config/workingHours.js — mirrors the storage
// shape and validation rules (see that file for the design rationale,
// notably: "breaks" are represented as the implicit gap between consecutive
// custom periods, not a separate array). Keep in sync with the backend.

export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]

export const DAY_LABELS_AR = {
  0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت',
}

export const MODE_OPTIONS = [
  { value: 'full_day', label: 'اليوم بالكامل' },
  { value: 'unavailable', label: 'غير متاح' },
  { value: 'custom', label: 'فترات مخصصة' },
]

// Quick-fill presets for a custom day — purely a UI convenience (fills in
// `periods`), not a distinct stored concept.
export const QUICK_PRESETS = [
  { key: 'morning', label: 'صباحًا', periods: [{ start: '08:00', end: '12:00' }] },
  { key: 'after10', label: 'بعد الساعة 10 صباحًا', periods: [{ start: '10:00', end: '22:00' }] },
  { key: 'noon_to_midnight', label: 'من 12 ظهرًا حتى 12 منتصف الليل', periods: [{ start: '12:00', end: '23:59' }] },
  { key: 'full_day_24h', label: 'طوال اليوم (24 ساعة)', periods: [{ start: '00:00', end: '23:59' }] },
]

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTimeString(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function buildDefaultWorkingHours() {
  return DAYS_OF_WEEK.map((dayOfWeek) => ({ dayOfWeek, mode: 'unavailable', periods: [] }))
}

/**
 * One-line, compact summary for a locked teacher-context card (e.g. the
 * "add student" flow's continuation entry point from the onboarding
 * wizard's success page) — not a full schedule breakdown, WorkingHoursEditor
 * already owns that; just enough to confirm "this is the right teacher" at
 * a glance.
 */
export function summarizeWorkingHoursDays(days) {
  if (!Array.isArray(days) || !days.length) return 'لم تُحدد أوقات العمل بعد'
  const available = days.filter((d) => d?.mode && d.mode !== 'unavailable').length
  if (!available) return 'غير متاح في أي يوم حاليًا'
  return `متاح ${available} ${available === 1 ? 'يوم' : 'أيام'} أسبوعيًا`
}

/**
 * Same validation rules as the backend's validateWorkingHoursDays — used so
 * the wizard/editor can show an inline error before ever submitting, while
 * the backend remains the actual security/data-integrity boundary.
 */
export function validateWorkingHoursDays(days) {
  if (!Array.isArray(days) || !days.length) return 'يجب إدخال أوقات العمل لكل أيام الأسبوع'
  const seen = new Set()
  for (const day of days) {
    if (!day || typeof day !== 'object') return 'صيغة يوم العمل غير صالحة'
    const { dayOfWeek, mode, periods } = day
    if (!DAYS_OF_WEEK.includes(dayOfWeek)) return 'رقم اليوم غير صالح'
    if (seen.has(dayOfWeek)) return 'تم تكرار نفس اليوم أكثر من مرة'
    seen.add(dayOfWeek)
    if (!MODE_OPTIONS.some((o) => o.value === mode)) return 'حالة يوم العمل غير صالحة'
    if (mode !== 'custom') {
      if (Array.isArray(periods) && periods.length) return 'لا يمكن إضافة فترات إلا عند اختيار "فترات مخصصة"'
      continue
    }
    if (!Array.isArray(periods) || !periods.length) return 'يجب إضافة فترة عمل واحدة على الأقل عند اختيار "فترات مخصصة"'
    const ranges = []
    for (const p of periods) {
      if (!p || !isValidTimeString(p.start) || !isValidTimeString(p.end)) return 'صيغة وقت الفترة غير صالحة'
      const start = toMinutes(p.start)
      const end = toMinutes(p.end)
      if (start >= end) return 'وقت بداية الفترة يجب أن يكون قبل وقت النهاية'
      ranges.push([start, end])
    }
    ranges.sort((a, b) => a[0] - b[0])
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i][0] < ranges[i - 1][1]) return 'توجد فترات عمل متداخلة في نفس اليوم'
    }
  }
  return null
}

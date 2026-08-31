// Client twin of server/src/config/teacherProfile.js (+ categories.js) — see
// server/src/config/teacherIdentity.js for why this is intentionally
// duplicated rather than shared (client/server are separate deployables with
// no shared package in this repo). Keep values in sync with the backend.

// DEPRECATED as a form's option source — the teaching-subject catalog is now
// dynamic (see hooks/useTeachingSubjects.js), so forms must render from the
// live `useTeachingSubjects()` list, not this frozen array. Kept only as:
//   (a) the last-resort fallback inside subjectLabel() below (label shown
//       for one tick before the live catalog has loaded, or if a request
//       ever fails), and
//   (b) input to buildLegacyOptions() when a caller truly has no live data.
const LEGACY_TEACHER_CATEGORY_OPTIONS = [
  { value: 'tajweed', label: 'التجويد' },
  { value: 'hifz', label: 'الحفظ' },
  { value: 'nazra', label: 'النظر' },
  { value: 'arabic', label: 'العربية' },
  { value: 'quran', label: 'القرآن' },
  { value: 'other', label: 'أخرى' },
]
// Back-compat alias — a handful of call sites may still import this name;
// prefer the live `useTeachingSubjects()` list for anything user-facing.
export const TEACHER_CATEGORY_OPTIONS = LEGACY_TEACHER_CATEGORY_OPTIONS

export const SHIFT_OPTIONS = [
  { value: 'morning', label: 'صباحًا' },
  { value: 'evening', label: 'مساءً' },
]

/**
 * Resolves a teaching-subject key's Arabic label from the LIVE catalog list
 * (as fetched by `useTeachingSubjects()`/`useAdminTeachingSubjects()`),
 * falling back to the static legacy map only while that list is still
 * loading/unavailable or for a key it doesn't contain (e.g. before the very
 * first successful fetch). This is what every consumer should call instead
 * of the old static-array-only `teacherCategoryLabel()`.
 */
export function subjectLabel(subjects, value) {
  if (!value) return null
  const fromCatalog = Array.isArray(subjects) ? subjects.find((s) => s.key === value) : null
  if (fromCatalog) return fromCatalog.nameAr
  return LEGACY_TEACHER_CATEGORY_OPTIONS.find((o) => o.value === value)?.label || null
}

// Legacy, static-only lookup — kept only for the few non-component call
// sites (e.g. plain utility functions with no hook access) that genuinely
// cannot reach the live catalog. Prefer `subjectLabel(subjects, value)` in
// any component that already has (or can fetch) the live list.
export function teacherCategoryLabel(value) {
  return LEGACY_TEACHER_CATEGORY_OPTIONS.find(o => o.value === value)?.label || null
}

export function teacherShiftsLabel(shifts) {
  if (!Array.isArray(shifts) || !shifts.length) return null
  return shifts.map(s => SHIFT_OPTIONS.find(o => o.value === s)?.label).filter(Boolean).join('، ')
}

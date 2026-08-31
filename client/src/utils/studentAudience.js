// Client twin of server/src/config/studentAudience.js — see
// server/src/config/teacherIdentity.js for why this is intentionally
// duplicated rather than shared (client/server are separate deployables with
// no shared package in this repo). Keep values in sync with the backend.
//
// Audience categories ("الفئة العمرية/النوع") — a SEPARATE taxonomy from
// teaching specialization (utils/teacherProfile.js's TEACHER_CATEGORY_OPTIONS).
export const AUDIENCE_CATEGORY_OPTIONS = [
  { value: 'children', label: 'أطفال' },
  { value: 'teenagers', label: 'ناشئون' },
  { value: 'adults', label: 'كبار' },
  { value: 'men', label: 'رجال' },
  { value: 'women', label: 'نساء' },
  { value: 'all', label: 'جميع الفئات' },
]

export function audienceCategoryLabel(value) {
  return AUDIENCE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label || null
}

export function audienceCategoriesLabel(values) {
  if (!Array.isArray(values) || !values.length) return null
  return values.map((v) => audienceCategoryLabel(v)).filter(Boolean).join('، ')
}

// Client twin of server/src/config/teacherProfile.js (+ categories.js) — see
// server/src/config/teacherIdentity.js for why this is intentionally
// duplicated rather than shared (client/server are separate deployables with
// no shared package in this repo). Keep values in sync with the backend.

// Same taxonomy already used for Course.category across the admin/marketing
// pages (e.g. AdminCourseFormPage.jsx) — reused here rather than inventing a
// separate list for teacher specialization.
export const TEACHER_CATEGORY_OPTIONS = [
  { value: 'tajweed', label: 'التجويد' },
  { value: 'hifz', label: 'الحفظ' },
  { value: 'nazra', label: 'النظر' },
  { value: 'arabic', label: 'العربية' },
  { value: 'quran', label: 'القرآن' },
  { value: 'other', label: 'أخرى' },
]

export const SHIFT_OPTIONS = [
  { value: 'morning', label: 'صباحًا' },
  { value: 'evening', label: 'مساءً' },
]

export function teacherCategoryLabel(value) {
  return TEACHER_CATEGORY_OPTIONS.find(o => o.value === value)?.label || null
}

export function teacherShiftsLabel(shifts) {
  if (!Array.isArray(shifts) || !shifts.length) return null
  return shifts.map(s => SHIFT_OPTIONS.find(o => o.value === s)?.label).filter(Boolean).join('، ')
}

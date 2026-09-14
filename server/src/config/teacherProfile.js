// Teacher professional-profile policy: category, hourly teaching rate, and
// shift availability captured on User (role: 'teacher'). Category reuses the
// shared teaching taxonomy (./categories.js) instead of a duplicated list —
// see that file's note.
//
// This is the backend twin of client/src/utils/teacherProfile.js — the two
// are intentionally duplicated rather than shared (see teacherIdentity.js for
// why: client/server are separate deployables with no shared package here),
// but any change to the canonical values must be made in both places.

const { isValidAudienceCategoriesArray } = require('./studentAudience')
// Dynamic catalog-backed check — replaces the old synchronous
// isValidTeachingCategory() allow-list as the authoritative validator so a
// newly admin-created subject (e.g. "الرياضيات") is accepted, while an
// unknown or archived key is not. See services/teachingSubject.service.js.
const { isValidActiveKey } = require('../services/teachingSubject.service')

const SHIFT = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  NIGHT: 'night',
  FULL_DAY: 'full_day',
}
const SHIFT_VALUES = Object.values(SHIFT)

function isValidShift(value) {
  return SHIFT_VALUES.includes(value)
}

function isValidShiftsArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isValidShift)
}

async function isValidSpecializationsArray(value) {
  if (!Array.isArray(value)) return false
  const results = await Promise.all(value.map(isValidActiveKey))
  return results.every(Boolean)
}

// Validates whatever subset of category/hourlyRate/availableShifts/
// specializations/audienceCategories is present on a create/update request
// body. Returns the first Arabic error message, or null if every provided
// field is well-formed. Presence/required-ness (e.g. "category is mandatory
// on create") is the caller's responsibility — this only checks format/enum
// validity, so it's safe to reuse for partial update payloads too.
//
// Async — category/specializations now validate against the dynamic
// teaching-subject catalog (a DB-backed, cached check), not a static array.
// Every caller must `await` this.
async function validateTeacherProfileFields(body) {
  if (body.category !== undefined && body.category !== null && body.category !== '' && !(await isValidActiveKey(body.category))) {
    return 'الفئة المحددة غير صالحة'
  }
  if (body.hourlyRate !== undefined && body.hourlyRate !== null && body.hourlyRate !== '') {
    const n = Number(body.hourlyRate)
    if (!Number.isFinite(n) || n < 0) return 'سعر ساعة التدريس يجب أن يكون رقمًا موجبًا'
  }
  if (body.availableShifts !== undefined && body.availableShifts !== null) {
    if (!Array.isArray(body.availableShifts) || !body.availableShifts.every(isValidShift)) {
      return 'قيمة الشيفت المحددة غير صالحة'
    }
  }
  // Multiple teaching specializations ("تخصصات التدريس") — the plural
  // counterpart to the legacy singular `category` field. A teacher may hold
  // more than one (e.g. تجويد + حفظ).
  if (body.specializations !== undefined && body.specializations !== null) {
    if (!(await isValidSpecializationsArray(body.specializations))) {
      return 'قائمة التخصصات تحتوي على قيمة غير صالحة'
    }
  }
  // Audience categories ("الفئات": أطفال/ناشئون/كبار/رجال/نساء/جميع الفئات) —
  // a separate taxonomy from teaching specialization, see studentAudience.js.
  if (body.audienceCategories !== undefined && body.audienceCategories !== null) {
    if (!isValidAudienceCategoriesArray(body.audienceCategories)) {
      return 'قائمة الفئات تحتوي على قيمة غير صالحة'
    }
  }
  return null
}

module.exports = {
  SHIFT, SHIFT_VALUES, isValidShift, isValidShiftsArray,
  isValidSpecializationsArray, validateTeacherProfileFields,
}

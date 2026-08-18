// Teacher professional-profile policy: category, hourly teaching rate, and
// shift availability captured on User (role: 'teacher'). Category reuses the
// shared teaching taxonomy (./categories.js) instead of a duplicated list —
// see that file's note.
//
// This is the backend twin of client/src/utils/teacherProfile.js — the two
// are intentionally duplicated rather than shared (see teacherIdentity.js for
// why: client/server are separate deployables with no shared package here),
// but any change to the canonical values must be made in both places.

const { isValidTeachingCategory } = require('./categories')

const SHIFT = { MORNING: 'morning', EVENING: 'evening' }
const SHIFT_VALUES = Object.values(SHIFT)

function isValidShift(value) {
  return SHIFT_VALUES.includes(value)
}

function isValidShiftsArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isValidShift)
}

// Validates whatever subset of category/hourlyRate/availableShifts is present
// on a create/update request body. Returns the first Arabic error message, or
// null if every provided field is well-formed. Presence/required-ness (e.g.
// "category is mandatory on create") is the caller's responsibility — this
// only checks format/enum validity, so it's safe to reuse for partial update
// payloads too.
function validateTeacherProfileFields(body) {
  if (body.category !== undefined && body.category !== null && body.category !== '' && !isValidTeachingCategory(body.category)) {
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
  return null
}

module.exports = { SHIFT, SHIFT_VALUES, isValidShift, isValidShiftsArray, validateTeacherProfileFields }

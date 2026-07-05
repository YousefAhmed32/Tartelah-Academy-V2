// Canonical teacher identity policy.
//
// gender (User.gender) is the ONE source of truth for a teacher's Arabic
// honorific and default-avatar presentation. It is never inferred — not
// from firstNameAr/lastNameAr, not from an uploaded photo, not from any
// other field. A teacher with no gender set is "unresolved": the frontend
// must show a neutral fallback (never a guessed male/female avatar or
// honorific) until an admin or the teacher explicitly sets it.
//
// This file is the backend twin of client/src/utils/teacherIdentity.js.
// The two are intentionally duplicated rather than shared — client and
// server are separate deployables with no shared package in this repo —
// but any change to the canonical values or honorific copy must be made
// in both places.

const GENDER = { MALE: 'male', FEMALE: 'female' }
const GENDER_VALUES = Object.values(GENDER)

const HONORIFIC_AR = {
  [GENDER.MALE]: 'الأستاذ',
  [GENDER.FEMALE]: 'الأستاذة',
}

const ROLE_LABEL_AR = {
  [GENDER.MALE]: 'معلم',
  [GENDER.FEMALE]: 'معلمة',
}

function isValidGender(value) {
  return GENDER_VALUES.includes(value)
}

module.exports = { GENDER, GENDER_VALUES, HONORIFIC_AR, ROLE_LABEL_AR, isValidGender }

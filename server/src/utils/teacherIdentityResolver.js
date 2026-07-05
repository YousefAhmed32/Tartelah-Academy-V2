const { GENDER, HONORIFIC_AR, ROLE_LABEL_AR, isValidGender } = require('../config/teacherIdentity')

// Pure identity resolution — the algorithmic core mirrored by
// client/src/utils/teacherIdentity.js for on-screen presentation. Returns an
// `avatarKind` rather than a concrete file path/URL: asset paths and
// URL-building (getFileUrl) are a frontend/runtime concern, so every
// consumer maps avatarKind -> its own concrete asset. Keeping this pure
// (no I/O, no DOM) is what makes the male/female/unresolved rules
// unit-testable independent of any rendering layer.
function resolveTeacherIdentity(teacher) {
  const gender = isValidGender(teacher?.gender) ? teacher.gender : null
  const isResolved = gender !== null
  const hasCustomAvatar = Boolean(teacher?.avatar)

  let avatarKind
  if (hasCustomAvatar) avatarKind = 'custom'
  else if (gender === GENDER.MALE) avatarKind = 'male-default'
  else if (gender === GENDER.FEMALE) avatarKind = 'female-default'
  else avatarKind = 'neutral-default'

  return {
    gender,
    isResolved,
    hasCustomAvatar,
    avatarKind,
    roleLabelAr: gender ? ROLE_LABEL_AR[gender] : 'معلم القرآن الكريم',
    honorificAr: gender ? HONORIFIC_AR[gender] : null,
  }
}

module.exports = { resolveTeacherIdentity }

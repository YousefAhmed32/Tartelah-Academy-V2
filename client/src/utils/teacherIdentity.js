import { getFileUrl } from '../config/constants.js'

// Centralized teacher identity presentation — the ONE place that turns raw
// teacher data (gender + avatar) into what gets shown on screen. Nothing
// outside this file should ever write `teacher.gender === 'female'` or pick
// a default avatar inline; every surface (Teachers page, teacher profile,
// course instructor card, admin CRM, teacher dashboard) calls
// resolveTeacherIdentity() so a rule change (wording, asset, fallback logic)
// only has to happen once.
//
// The core algorithm here is intentionally mirrored 1:1 in
// server/src/utils/teacherIdentityResolver.js (unit-tested there with Jest,
// since this client has no test runner configured). Keep the two in sync.

export const TEACHER_GENDER = { MALE: 'male', FEMALE: 'female' }

const HONORIFIC_AR = {
  [TEACHER_GENDER.MALE]: 'الأستاذ',
  [TEACHER_GENDER.FEMALE]: 'الأستاذة',
}

const ROLE_LABEL_AR = {
  [TEACHER_GENDER.MALE]: 'معلم',
  [TEACHER_GENDER.FEMALE]: 'معلمة',
}

const DEFAULT_AVATARS = {
  'male-default': '/images/avter man.png',
  'female-default': '/images/avter woman.png',
  'neutral-default': '/images/avatars/teacher-neutral-default.svg',
}

function isValidGender(value) {
  return value === TEACHER_GENDER.MALE || value === TEACHER_GENDER.FEMALE
}

/**
 * @param {{ gender?: string|null, avatar?: string|null }} teacher
 * @returns {{
 *   gender: 'male'|'female'|null,
 *   isResolved: boolean,
 *   hasCustomAvatar: boolean,
 *   roleLabelAr: string,
 *   honorificAr: string|null,
 *   displayAvatar: string,
 *   defaultAvatar: string,
 * }}
 */
export function resolveTeacherIdentity(teacher) {
  const gender = isValidGender(teacher?.gender) ? teacher.gender : null
  const isResolved = gender !== null
  const hasCustomAvatar = Boolean(teacher?.avatar)

  const defaultAvatar = gender
    ? DEFAULT_AVATARS[`${gender}-default`]
    : DEFAULT_AVATARS['neutral-default']

  const displayAvatar = hasCustomAvatar ? getFileUrl(teacher.avatar) : defaultAvatar

  return {
    gender,
    isResolved,
    hasCustomAvatar,
    roleLabelAr: gender ? ROLE_LABEL_AR[gender] : 'معلم القرآن الكريم',
    honorificAr: gender ? HONORIFIC_AR[gender] : null,
    displayAvatar,
    defaultAvatar,
  }
}

/**
 * <img onError> handler for any `identity.displayAvatar` — if a real uploaded
 * photo fails to load, swap in the gender-correct default. Guards against an
 * infinite error loop if the default asset itself is missing.
 * @param {import('react').SyntheticEvent<HTMLImageElement>} event
 * @param {{ defaultAvatar: string }} identity
 */
export function handleAvatarError(event, identity) {
  const img = event.currentTarget
  if (img.dataset.avatarFallbackApplied) return
  img.dataset.avatarFallbackApplied = '1'
  img.src = identity.defaultAvatar
}

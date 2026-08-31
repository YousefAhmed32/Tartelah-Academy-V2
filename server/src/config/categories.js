// Shared teaching-subject taxonomy. As of the dynamic curriculum catalog
// (services/teachingSubject.service.js), this is no longer the authoritative
// validation source — TEACHING_CATEGORIES now only lists the six canonical
// keys seeded into the TeachingSubject collection as system entries (see
// migrations/seedTeachingSubjects.js), so every already-persisted
// User.category/specializations, Course.category, and
// AssignmentRequest.specialization value keeps matching without any data
// rewrite. New authoritative checks (including any new subject an admin
// creates) go through teachingSubject.service.js's isValidActiveKey()/
// isKnownKey() instead of this array.
//
// isValidTeachingCategory() is kept ONLY as a narrow, synchronous "is this
// one of the six canonical legacy keys" check for the handful of call sites
// that still need a sync answer with no DB round-trip (e.g. cheap early-exit
// guards) — it is deliberately NOT sufficient on its own to accept a new
// dynamic subject; those call sites must also accept the async catalog check.
const TEACHING_CATEGORIES = ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other']

// Last-resort label fallback (used only by teachingSubject.service.js's
// resolveLabel() if the catalog is somehow not yet seeded) — never the
// primary label source once the catalog exists.
const CURRICULUM_LABELS_AR_FALLBACK = {
  tajweed: 'التجويد', hifz: 'الحفظ', nazra: 'النظر',
  arabic: 'اللغة العربية', quran: 'القرآن الكريم', other: 'أخرى',
}

function isValidTeachingCategory(value) {
  return TEACHING_CATEGORIES.includes(value)
}

module.exports = { TEACHING_CATEGORIES, CURRICULUM_LABELS_AR_FALLBACK, isValidTeachingCategory }

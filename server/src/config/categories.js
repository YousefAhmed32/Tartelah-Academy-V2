// Shared teaching-subject taxonomy — the single source of truth for both
// Course.category (what a course teaches) and User.category (a teacher's
// specialization), so the two never drift into separate, inconsistent lists.
const TEACHING_CATEGORIES = ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other']

function isValidTeachingCategory(value) {
  return TEACHING_CATEGORIES.includes(value)
}

module.exports = { TEACHING_CATEGORIES, isValidTeachingCategory }

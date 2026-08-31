// Audience-category taxonomy ("الفئة العمرية/النوع") — who a teacher can
// teach / who a student is, e.g. children/teenagers/adults/men/women/all.
//
// Deliberately a SEPARATE taxonomy from teaching specializations
// (./categories.js's TEACHING_CATEGORIES — tajweed/hifz/nazra/arabic/quran/
// other). A teacher's audience category ("من يُدرِّس") and their teaching
// specialization ("ماذا يُدرِّس") are independent dimensions per the Phase 2
// spec — never merge them into one list.
const AUDIENCE_CATEGORIES = ['children', 'teenagers', 'adults', 'men', 'women', 'all']

const AUDIENCE_LABELS_AR = {
  children: 'أطفال',
  teenagers: 'ناشئون',
  adults: 'كبار',
  men: 'رجال',
  women: 'نساء',
  all: 'جميع الفئات',
}

function isValidAudienceCategory(value) {
  return AUDIENCE_CATEGORIES.includes(value)
}

function isValidAudienceCategoriesArray(value) {
  return Array.isArray(value) && value.every(isValidAudienceCategory)
}

module.exports = {
  AUDIENCE_CATEGORIES,
  AUDIENCE_LABELS_AR,
  isValidAudienceCategory,
  isValidAudienceCategoriesArray,
}

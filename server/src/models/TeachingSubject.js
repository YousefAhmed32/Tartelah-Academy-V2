const mongoose = require('mongoose')

// Dynamic, admin-manageable teaching-subject/curriculum catalog — replaces
// the previously hardcoded TEACHING_CATEGORIES allow-list (config/
// categories.js) as the authoritative source of valid subjects, while
// staying fully backward compatible with every record that already stores
// one of the six legacy plain-string keys ('tajweed'/'hifz'/'nazra'/
// 'arabic'/'quran'/'other').
//
// Key scheme (deliberately hybrid, see services/teachingSubject.service.js):
//   - The six canonical/system entries keep their existing semantic string
//     key ('tajweed', ...) so every already-stored User.category/
//     specializations, Course.category, and AssignmentRequest.specialization
//     value keeps matching without any data migration/rewrite.
//   - Any NEW subject an admin creates (e.g. "الرياضيات") has no natural
//     ASCII slug — rather than guess a transliteration, its key defaults to
//     its own ObjectId string (set by the pre-validate hook below), which is
//     already a stable, unique, URL/enum-safe identifier per the brief's
//     "stable unique identifier or slug" requirement.
const TeachingSubjectSchema = new mongoose.Schema({
  key: { type: String, trim: true, lowercase: true, unique: true },
  nameAr: { type: String, required: true, trim: true },
  nameEn: { type: String, trim: true, default: null },

  // Case/diacritic/spacing-insensitive normalized forms used ONLY for
  // duplicate detection (services/teachingSubject.service.js) — never shown
  // to users. Kept as plain indexed fields (not unique) because normalized
  // Arabic collisions must return the existing record via application logic
  // (findOne + reuse), not a hard DB-level rejection, so the "repeated
  // creation attempts select the existing entry" requirement can return a
  // friendly result rather than a 500.
  normalizedNameAr: { type: String, default: null },
  normalizedNameEn: { type: String, default: null },

  isActive: { type: Boolean, default: true }, // false = archived
  // The six seeded canonical subjects — cannot be archived-then-forgotten by
  // accident (UI still allows archiving them if truly unused) and their
  // `key` is never regenerated even if renamed.
  isSystem: { type: Boolean, default: false },
  order: { type: Number, default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

TeachingSubjectSchema.index({ isActive: 1, order: 1 })
TeachingSubjectSchema.index({ normalizedNameAr: 1 })
TeachingSubjectSchema.index({ normalizedNameEn: 1 })

TeachingSubjectSchema.pre('validate', function setDefaultKey(next) {
  if (!this.key) this.key = this._id.toString()
  next()
})

module.exports = mongoose.model('TeachingSubject', TeachingSubjectSchema)

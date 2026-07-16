const mongoose = require('mongoose')

const SEOSchema = new mongoose.Schema({
  title:        { type: String, trim: true, maxlength: 200 },
  description:  { type: String, trim: true, maxlength: 500 },
  keywords:     [{ type: String, trim: true }],
  ogImage:      { type: String },
  canonicalUrl: { type: String },
}, { _id: false })

const CurriculumSectionSchema = new mongoose.Schema({
  sectionTitleAr: { type: String, trim: true },
  sectionTitle:   { type: String, trim: true },
  lessons:        [{ type: String }],
}, { _id: false })

const CourseSchema = new mongoose.Schema({
  // ── Core Identity ─────────────────────────────────────────────────────────────
  nameAr: { type: String, required: true, trim: true, maxlength: 200 },
  name:   { type: String, trim: true, maxlength: 200 },
  slug:   { type: String, unique: true, sparse: true, lowercase: true, trim: true },

  // ── Descriptions ──────────────────────────────────────────────────────────────
  shortDescriptionAr: { type: String, trim: true, maxlength: 600 },
  shortDescription:   { type: String, trim: true, maxlength: 600 },
  descriptionAr:      { type: String },
  description:        { type: String },

  // ── Media ─────────────────────────────────────────────────────────────────────
  // GridFS file _ids (server/src/config/gridfs.js), NOT paths/URLs. Field
  // names kept as-is (not renamed to *Id) — many existing .select()
  // projections already name these fields, and an ObjectId serializes to a
  // plain hex string that client getFileUrl() already resolves to
  // `${BACKEND_URL}/api/v1/media/<id>`.
  thumbnailImage: { type: mongoose.Schema.Types.ObjectId, default: null },
  coverImage:     { type: mongoose.Schema.Types.ObjectId, default: null },
  introVideoUrl:  { type: String, trim: true, default: '' }, // YouTube URL

  // ── Classification ────────────────────────────────────────────────────────────
  category:    { type: String, enum: ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other'], default: 'other' },
  subCategory: { type: String, trim: true },
  tags:        [{ type: String, trim: true, lowercase: true }],
  language:    { type: String, enum: ['ar', 'en', 'both'], default: 'ar' },

  // ── People ────────────────────────────────────────────────────────────────────
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Level & Audience ──────────────────────────────────────────────────────────
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  level:      { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  ageGroup:   { type: String, enum: ['children', 'teens', 'adults'], default: 'adults' },

  // ── Academic ──────────────────────────────────────────────────────────────────
  estimatedDuration: { type: Number, default: 0 }, // hours
  lessonsCount:      { type: Number, default: 0 },
  durationWeeks:     { type: Number, default: 12 },

  // ── Rich Content ──────────────────────────────────────────────────────────────
  learningOutcomesAr: [{ type: String }],
  learningOutcomes:   [{ type: String }],
  requirementsAr:     [{ type: String }],
  requirements:       [{ type: String }],
  targetAudienceAr:   { type: String },
  targetAudience:     { type: String },
  syllabusAr:         [{ type: String }], // backward compat
  curriculum:         [CurriculumSectionSchema],

  // ── Display ───────────────────────────────────────────────────────────────────
  order:    { type: Number, default: 0 },
  featured: { type: Boolean, default: false },

  // ── Status & Publishing ───────────────────────────────────────────────────────
  status:               { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  isActive:             { type: Boolean, default: true },
  enrollmentEnabled:    { type: Boolean, default: true },
  certificateAvailable: { type: Boolean, default: false },

  // ── Stats ─────────────────────────────────────────────────────────────────────
  enrollmentCount: { type: Number, default: 0 },
  studentsCount:   { type: Number, default: 0 },
  rating:          { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:     { type: Number, default: 0 },

  // ── SEO ───────────────────────────────────────────────────────────────────────
  seo: { type: SEOSchema, default: () => ({}) },

  // ── Metadata ──────────────────────────────────────────────────────────────────
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

CourseSchema.index({ status: 1, featured: -1, order: 1 })
CourseSchema.index({ category: 1, status: 1 })
CourseSchema.index({ difficulty: 1, status: 1 })
CourseSchema.index({ tags: 1 })
CourseSchema.index({ studentsCount: -1 })

module.exports = mongoose.model('Course', CourseSchema)

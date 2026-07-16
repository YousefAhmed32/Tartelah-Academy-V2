const mongoose = require('mongoose')

const SEOSchema = new mongoose.Schema({
  title:        { type: String, trim: true, maxlength: 200 },
  description:  { type: String, trim: true, maxlength: 500 },
  keywords:     [{ type: String, trim: true }],
  canonicalUrl: { type: String, trim: true },
  ogImage:      { type: String },
  twitterCard:  { type: String, default: 'summary_large_image' },
  metaRobots:   { type: String, default: 'index, follow' },
}, { _id: false })

const ArticleSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true, maxlength: 300 },
  titleAr:    { type: String, trim: true, maxlength: 300 },
  slug:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  excerpt:    { type: String, trim: true, maxlength: 600 },
  excerptAr:  { type: String, trim: true, maxlength: 600 },
  content:    { type: String },
  contentAr:  { type: String },
  // GridFS file _id — kept as `coverImage` (not renamed) since existing
  // .populate()/.select() projections elsewhere don't touch this field, but
  // this specific field is read directly all over article.controller.js;
  // ObjectId serializes to a hex string that client getFileUrl() resolves.
  coverImage: { type: mongoose.Schema.Types.ObjectId, default: null },
  gallery:    [{ type: String }],

  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ArticleCategory' },
  tags:     [{ type: String, trim: true, lowercase: true }],

  status:      { type: String, enum: ['draft', 'published', 'scheduled', 'archived'], default: 'draft' },
  publishedAt: { type: Date },
  scheduledAt: { type: Date },

  featured:      { type: Boolean, default: false },
  featuredOrder: { type: Number, default: 0 },
  pinned:        { type: Boolean, default: false },

  readingTime: { type: Number, default: 1 },

  views:     { type: Number, default: 0 },
  likes:     { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },

  likedBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  seo: { type: SEOSchema, default: () => ({}) },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true })

// Text search index for full-text search
ArticleSchema.index({ title: 'text', titleAr: 'text', excerpt: 'text', excerptAr: 'text', content: 'text', tags: 'text' })

// Performance indexes (slug unique index already created by schema definition)
ArticleSchema.index({ status: 1, publishedAt: -1 })
ArticleSchema.index({ featured: 1, featuredOrder: 1 })
ArticleSchema.index({ category: 1, status: 1 })
ArticleSchema.index({ author: 1, status: 1 })
ArticleSchema.index({ views: -1 })
ArticleSchema.index({ deletedAt: 1 })

// Auto-calculate reading time before save
ArticleSchema.pre('save', function (next) {
  const text = [this.content, this.contentAr].filter(Boolean).join(' ')
  const words = text.replace(/<[^>]*>/g, '').trim().split(/\s+/).length
  this.readingTime = Math.max(1, Math.ceil(words / 200))
  next()
})

module.exports = mongoose.model('Article', ArticleSchema)

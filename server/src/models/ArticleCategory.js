const mongoose = require('mongoose')

const ArticleCategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 100 },
  nameAr:      { type: String, trim: true, maxlength: 100 },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true, maxlength: 300 },
  color:       { type: String, default: '#7c3aed' },
  icon:        { type: String, default: '📚' },
  order:       { type: Number, default: 0 },
}, { timestamps: true })

ArticleCategorySchema.index({ order: 1 })

module.exports = mongoose.model('ArticleCategory', ArticleCategorySchema)

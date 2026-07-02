const mongoose = require('mongoose')

const CardSchema = new mongoose.Schema({
  role: { type: String, enum: ['teacher', 'student', 'achievement'], required: true },
  image: { type: String },
  nameAr: { type: String, default: '' },
  titleAr: { type: String, default: '' },
  descriptionAr: { type: String, default: '' },
  badgeAr: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { _id: false })

const BannerSchema = new mongoose.Schema({
  image: { type: String },
  titleAr: { type: String, default: '' },
  subtitleAr: { type: String, default: '' },
  buttonText: { type: String, default: '' },
  buttonLink: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { _id: false })

const DEFAULT_CARDS = [
  { role: 'teacher', order: 0 },
  { role: 'student', order: 1 },
  { role: 'achievement', order: 2 },
]

const SuccessStorySchema = new mongoose.Schema({
  displayMode: { type: String, enum: ['cards', 'banner'], default: 'cards' },
  isActive: { type: Boolean, default: true },
  cards: { type: [CardSchema], default: DEFAULT_CARDS },
  banner: { type: BannerSchema, default: () => ({}) },
}, { timestamps: true })

// Singleton — one document holds the whole section config
module.exports = mongoose.model('SuccessStory', SuccessStorySchema)
module.exports.DEFAULT_CARDS = DEFAULT_CARDS

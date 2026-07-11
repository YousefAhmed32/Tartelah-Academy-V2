const mongoose = require('mongoose')

const NewsletterSubscriberSchema = new mongoose.Schema({
  email:    { type: String, required: true, trim: true, lowercase: true, unique: true },
  isActive: { type: Boolean, default: true },
  source:   { type: String, default: 'footer' },
}, { timestamps: true })

module.exports = mongoose.model('NewsletterSubscriber', NewsletterSubscriberSchema)

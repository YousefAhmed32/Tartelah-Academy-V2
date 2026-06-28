const mongoose = require('mongoose')

const ContactMessageSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, trim: true, lowercase: true },
  phone:            { type: String, trim: true },
  country:          { type: String, trim: true },
  subject:          { type: String, trim: true },
  message:          { type: String, required: true, trim: true },
  preferredContact: { type: String, enum: ['email', 'phone', 'whatsapp'], default: 'email' },
  status:           { type: String, enum: ['new', 'read', 'replied', 'archived'], default: 'new' },
  adminNotes:       { type: String },
  repliedAt:        { type: Date },
  readAt:           { type: Date },
  ip:               { type: String },
  userAgent:        { type: String },
}, { timestamps: true })

ContactMessageSchema.index({ status: 1, createdAt: -1 })
ContactMessageSchema.index({ email: 1 })

module.exports = mongoose.model('ContactMessage', ContactMessageSchema)

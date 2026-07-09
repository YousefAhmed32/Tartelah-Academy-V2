const mongoose = require('mongoose')

// Lightweight thumbs up/down on assistant answers — no message content is
// stored, only enough to correlate with server logs for the given turn.
const AIFeedbackSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, trim: true, maxlength: 100 },
  responseId:     { type: String, required: true, trim: true, maxlength: 100 },
  value:          { type: String, enum: ['helpful', 'not_helpful'], required: true },
  persona:        { type: String, enum: ['tutor', 'concierge'], default: 'concierge' },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

AIFeedbackSchema.index({ createdAt: -1 })

module.exports = mongoose.model('AIFeedback', AIFeedbackSchema)

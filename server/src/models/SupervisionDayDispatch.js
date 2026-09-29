const mongoose = require('mongoose')

// Only a handoff marker. The recipient opens the live Session list; no copied
// schedule can become a second source of truth after a reschedule.
const schema = new mongoose.Schema({
  dayStart: { type: Date, required: true },
  dayEnd: { type: Date, required: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sessionCount: { type: Number, required: true, min: 0 },
}, { timestamps: true })

schema.index({ dayStart: 1, createdAt: -1 })
module.exports = mongoose.model('SupervisionDayDispatch', schema)

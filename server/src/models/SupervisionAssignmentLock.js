const mongoose = require('mongoose')

// Short-lived database lease serializes primary-assignment changes for one
// teacher/team even when the API is deployed on multiple Node processes.
const Schema = new mongoose.Schema({
  _id: String,
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false })

Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
module.exports = mongoose.model('SupervisionAssignmentLock', Schema)

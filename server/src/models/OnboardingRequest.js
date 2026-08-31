const mongoose = require('mongoose')

// Idempotency + audit record for the "create a teacher with their students"
// admin wizard (services/onboarding.service.js). Only ever written on a
// SUCCESSFUL run — a failed attempt is fully compensated/rolled back (see
// the service) and intentionally leaves no row here, so retrying with the
// same clientRequestId after a failure is allowed to try again from scratch.
// A retry using the same clientRequestId AFTER a completed run instead
// short-circuits to the original result instead of creating a duplicate
// teacher/students — this is what makes the wizard endpoint safe against a
// network-retry or an accidental double-submit of the same request.
const OnboardingRequestSchema = new mongoose.Schema({
  clientRequestId: { type: String, required: true, unique: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Small denormalized snapshot returned on idempotent replay so the client
  // doesn't need a second round-trip to re-fetch what was created.
  resultSummary: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

module.exports = mongoose.model('OnboardingRequest', OnboardingRequestSchema)

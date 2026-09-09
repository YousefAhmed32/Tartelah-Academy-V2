const mongoose = require('mongoose')

// Evaluation/renewal survey (Phase 2 §13) — tied to one subscription's
// renewal cycle. One survey per subscription (unique index), triggered
// automatically near expiry (see jobs/surveyTrigger.job.js, lead time
// configurable via AcademySettings.surveyLeadDays). A renewal-intention
// answer here is informational only — it NEVER auto-renews or charges
// anything (the student still goes through the real renewal-request flow,
// services/renewal.service.js); a teacher-change request here links to the
// EXISTING transfer workflow rather than creating a second one.
const SurveySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // the teacher this cycle's survey is about — denormalized for admin filtering

  status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
  triggeredAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

  // Ratings — 1 (poor) to 5 (excellent), consistent scale across the whole survey.
  teacherCommitmentRating: { type: Number, min: 1, max: 5 },
  academyFollowUpRating: { type: Number, min: 1, max: 5 },
  reportQualityRating: { type: Number, min: 1, max: 5 },
  studentProgressRating: { type: Number, min: 1, max: 5 },
  recommendLikelihood: { type: Number, min: 1, max: 5 }, // "likely to recommend us"

  notes: { type: String, trim: true, maxlength: 1000 },
  renewalIntention: { type: String, enum: ['yes', 'no', 'undecided'] },
  continueWithSameTeacher: { type: Boolean, default: null },
  requestTeacherChange: { type: Boolean, default: false },
  requestAdminContact: { type: Boolean, default: false },

  // Set once an admin has acted on a requestTeacherChange/requestAdminContact
  // flag (e.g. opened the transfer screen / made contact) — a lightweight
  // follow-up marker, not a second workflow.
  followedUpBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  followedUpAt: { type: Date },
}, { timestamps: true })

SurveySchema.index({ subscriptionId: 1 }, { unique: true })
SurveySchema.index({ studentId: 1, status: 1 })
SurveySchema.index({ status: 1, requestAdminContact: 1 })
SurveySchema.index({ teacherId: 1, status: 1 })

module.exports = mongoose.model('Survey', SurveySchema)

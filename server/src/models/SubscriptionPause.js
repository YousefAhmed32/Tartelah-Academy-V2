const mongoose = require('mongoose')

// Durable pause/resume audit history (Phase 2 meeting addendum §2). One
// document per pause EPISODE — never overwritten/reused across episodes, so
// a subscription paused and resumed multiple times keeps a full, honest
// history instead of the old LessonWallet.freeze* fields' single-slot
// "latest freeze only" limitation. LessonWallet's own freeze fields still
// reflect current live status (read by wallet.service.js/UI); this
// collection is the record of WHAT happened, WHEN, WHY, and BY WHOM.
const SubscriptionPauseSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  status: { type: String, enum: ['active', 'resumed'], default: 'active' },

  reason: { type: String, required: true, trim: true },
  effectiveDate: { type: Date, required: true },
  plannedResumeDate: { type: Date },

  pausedAt: { type: Date, required: true, default: Date.now },
  pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Snapshot of what the subscription's billing dates were BEFORE the pause
  // — the resume step extends from these, not from whatever the field holds
  // at resume time, so a chain of edits in between can never corrupt the math.
  originalEndDate: { type: Date },
  originalRenewalDate: { type: Date },

  // Exactly what this pause touched — so resume restores precisely this set
  // and nothing else (a rule/session independently changed by other admin
  // action in the meantime is never silently clobbered).
  affectedScheduleRuleIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'ScheduleRule', default: [] },
  affectedSessionIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Session', default: [] },
  walletBalanceAtPause: { type: Number },

  // Populated only once resumed.
  resumedAt: { type: Date },
  resumedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resumeDurationDays: { type: Number },
  newEndDate: { type: Date },
  newRenewalDate: { type: Date },
  restoredScheduleRuleIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'ScheduleRule', default: [] },
  regeneratedSessionIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Session', default: [] },

  // Idempotency guards — see subscriptionLifecycle.service.js.
  pauseIdempotencyKey: { type: String },
  resumeIdempotencyKey: { type: String },
}, { timestamps: true })

SubscriptionPauseSchema.index({ subscriptionId: 1, createdAt: -1 })
SubscriptionPauseSchema.index({ studentId: 1, createdAt: -1 })
// At most one OPEN (status: 'active') pause episode per subscription at a
// time — the actual idempotency backstop beneath the application-level
// "already paused" check in the service.
SubscriptionPauseSchema.index(
  { subscriptionId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' }, name: 'uniq_open_pause_per_subscription' }
)

module.exports = mongoose.model('SubscriptionPause', SubscriptionPauseSchema)

const mongoose = require('mongoose')

// Resumable "create a teacher with their students" onboarding session
// (Phase 2 Part 2c). Deliberately a NEW, narrowly-scoped model rather than
// an extension of `OnboardingRequest` — that model is a pure idempotency/
// replay cache for the older ALL-AT-ONCE wizard endpoint (write-once, never
// mutated, no notion of "in progress"), while this one is a genuinely
// mutable, long-lived draft that tracks incremental progress one student at
// a time. Bolting session/step/status semantics onto `OnboardingRequest`
// would have changed what that model means for every existing caller, which
// is exactly the "second competing system" risk this design avoids — the
// two coexist for different jobs. `OnboardingRequest` and the old one-shot
// endpoint are both left fully intact for backward compatibility.
//
// This is NOT a second source of truth for "what is booked" or "who is
// assigned to whom" — `User`, `AssignmentRequest`, `ScheduleRule`, and
// `Subscription` remain canonical for that. This model only tracks the
// wizard's own progress so it can be resumed, and lets the availability
// engine's reservation locks (`ScheduleReservationLock`) reference which
// in-progress session created them.
const OnboardingSessionSchema = new mongoose.Schema({
  clientRequestId: { type: String, required: true, unique: true }, // idempotent "start session" replay
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['draft', 'teacher_saved', 'adding_students', 'ready_for_review', 'finalizing', 'completed', 'cancelled', 'expired'],
    default: 'teacher_saved',
  },
  currentStep: { type: String, enum: ['teacher', 'specialization', 'workingHours', 'students', 'review'], default: 'students' },
  // Every student successfully saved into this session via the incremental
  // "save student" endpoint — each one is a REAL, already-persisted `User` +
  // (optionally) `Subscription` + `AssignmentRequest` by the time its id
  // lands here; this array is a resumability index, not a queue of pending
  // writes.
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  cancelReason: { type: String, trim: true },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true })

OnboardingSessionSchema.index({ createdBy: 1, status: 1, createdAt: -1 })
OnboardingSessionSchema.index({ teacherId: 1 })

module.exports = mongoose.model('OnboardingSession', OnboardingSessionSchema)

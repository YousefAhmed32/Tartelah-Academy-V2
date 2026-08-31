const mongoose = require('mongoose')

// Concurrency-safety primitive for the assignment-request reservation
// workflow (Phase 2 Part 2c). This collection is NOT a second source of
// truth for "what is booked" — `ScheduleRule`/`Session` (once activated) and
// `AssignmentRequest.status` (while pending teacher approval) remain
// canonical, and `services/availability.service.js` keeps reading from
// those. A lock document's only job is to make the *write* that creates a
// brand-new reservation for a given (teacher, day-of-week, time) atomic:
// MongoDB enforces the unique index below on each individual insert, so two
// near-simultaneous attempts to reserve the exact same slot can never both
// succeed — one insert wins, the other fails with a duplicate-key error the
// caller turns into a 409.
//
// Lifecycle: acquired the moment a reservation is first requested (an
// AssignmentRequest entering `pending_teacher_approval`, or the synchronous
// existing-student/immediate-override path just before activation);
// released the moment that reservation either becomes durable on its own
// (an active `ScheduleRule` now exists — the lock's job is done) or the
// request leaves every reserving status (rejected/time_change_requested/
// cancelled/reassigned). A held lock with no matching live AssignmentRequest
// is stale and safe to ignore/clean up — see `assignment.service.js`'s
// acquire/release helpers, the only code that ever touches this collection.
//
// Deliberately does NOT attempt to model arbitrary interval overlap (e.g.
// 12:00-13:00 vs 12:30-13:30) — that residual gap is inherent to a
// standalone mongod with no multi-document transactions (same documented
// limitation as wallet.service.js) and is narrowed, not eliminated, by the
// authoritative `checkAvailability()` re-check that always runs immediately
// before a lock is acquired.
const ScheduleReservationLockSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  time: { type: String, required: true }, // 'HH:mm', matches AssignmentRequest.schedule.days[].time
  assignmentRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignmentRequest' },
  onboardingSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OnboardingSession', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

ScheduleReservationLockSchema.index({ teacherId: 1, dayOfWeek: 1, time: 1 }, { unique: true })
ScheduleReservationLockSchema.index({ assignmentRequestId: 1 })

module.exports = mongoose.model('ScheduleReservationLock', ScheduleReservationLockSchema)

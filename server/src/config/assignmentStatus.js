// Assignment-request state machine (Phase 2 Part 2 §8). Single source of
// truth for valid statuses and valid transitions between them — every
// mutation in services/assignment.service.js must go through
// assertTransition() rather than setting `.status` directly, so an invalid
// transition is rejected the same way everywhere.

const ASSIGNMENT_STATUSES = [
  'draft',
  'pending_teacher_approval',
  'accepted',
  'rejected',
  'time_change_requested',
  'reassigned',
  'completed',
  'cancelled',
]

// `accepted` is a short-lived transitional state (teacher just said yes, the
// system is about to generate the schedule) — it only ever moves forward to
// `completed` once activation succeeds. If activation fails, the request
// stays in `accepted` so a retry (calling activation again) can pick up
// exactly where it left off, instead of silently reverting to "pending".
const TRANSITIONS = {
  draft: ['pending_teacher_approval', 'accepted', 'cancelled'],
  pending_teacher_approval: ['accepted', 'rejected', 'time_change_requested', 'cancelled'],
  accepted: ['completed'],
  rejected: ['pending_teacher_approval', 'reassigned', 'cancelled'],
  time_change_requested: ['pending_teacher_approval', 'reassigned', 'cancelled'],
  reassigned: [],
  completed: [],
  cancelled: [],
}

function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to)
}

class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`انتقال حالة غير صالح: ${from} → ${to}`)
    this.status = 409
    this.from = from
    this.to = to
  }
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to)
}

// Statuses that still hold a "reservation" on a slot — the availability
// engine excludes any OTHER candidate slot from colliding with these, and
// releases the hold the moment a request leaves this set (rejected/
// cancelled/reassigned/completed all fall through to their own real
// schedule or to nothing). `pending_teacher_approval` holds `schedule.days`
// (the originally requested slot); `time_change_requested` holds
// `teacherResponse.proposedSchedule.days` instead — the teacher's own
// alternative, awaiting an admin decision, must not be grabbed by a second
// request in the meantime (see availability.service.js's loadBusyByDay,
// the only place that reads this set).
const RESERVING_STATUSES = ['pending_teacher_approval', 'time_change_requested']

// Within RESERVING_STATUSES, which statuses hold their ORIGINAL requested
// slot (`schedule.days`) vs. a teacher-proposed replacement
// (`teacherResponse.proposedSchedule.days`, falling back to the legacy
// singular `teacherResponse.proposedTime` for rows written before that field
// existed). Kept as an explicit map (not inferred) so a future reserving
// status must deliberately choose one — silently defaulting would be wrong.
const RESERVING_SLOT_SOURCE = {
  pending_teacher_approval: 'schedule',
  time_change_requested: 'proposedSchedule',
}

module.exports = {
  ASSIGNMENT_STATUSES, TRANSITIONS, RESERVING_STATUSES, RESERVING_SLOT_SOURCE,
  canTransition, assertTransition, InvalidTransitionError,
}

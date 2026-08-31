const mongoose = require('mongoose')
const { ASSIGNMENT_STATUSES } = require('../config/assignmentStatus')

// Assignment-request state machine (Phase 2 Part 2 §8) — the durable record
// behind "send this student to the teacher for approval" / "assign
// immediately" / accept / reject / propose-alternative-time / reassign.
// Never mutate `status` directly outside services/assignment.service.js —
// every transition must go through config/assignmentStatus.js's
// assertTransition() so an invalid jump is rejected consistently everywhere.
const ScheduleDaySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Sunday..6=Saturday, matches ScheduleRule/TeacherWorkingHours
  time: { type: String, required: true }, // 'HH:mm', 24h — same convention as workingHours.js
}, { _id: false })

const ProposedTimeSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6 },
  time: { type: String },
  note: { type: String, trim: true },
}, { _id: false })

// Flexible multi-day alternative schedule (Phase 2 change request #2) — a
// full replacement schedule the teacher proposes, not just one substitute
// slot. `days` reuses the exact same shape as `schedule.days`, so it round-
// trips through the same availability engine, lock-acquisition helpers, and
// (if admin adopts it as-is) `editAndResend`'s `updates.schedule.days`
// unchanged. `proposedTime` above is kept only for backward-compatible reads
// of pre-existing rows created before this field existed — every new
// time_change response populates BOTH (proposedTime mirrors days[0]).
const ProposedScheduleSchema = new mongoose.Schema({
  days: { type: [ScheduleDaySchema], default: [] },
}, { _id: false })

const TeacherResponseSchema = new mongoose.Schema({
  type: { type: String, enum: ['accept', 'reject', 'time_change'] },
  reason: { type: String, trim: true }, // required for 'reject'
  proposedTime: ProposedTimeSchema, // legacy single-slot mirror — see ProposedScheduleSchema above
  proposedSchedule: ProposedScheduleSchema, // set for 'time_change' — the real, multi-day proposal
  note: { type: String, trim: true },
  respondedAt: { type: Date },
}, { _id: false })

const ResponseHistoryEntrySchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. 'created', 'accept', 'reject', 'time_change', 'edited_resent', 'reassigned', 'cancelled', 'immediate_override'
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String },
  note: { type: String, trim: true },
  at: { type: Date, default: Date.now },
  snapshot: { type: mongoose.Schema.Types.Mixed }, // small, non-sensitive context (never a password/token)
}, { _id: false })

const AssignmentRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentType: { type: String, enum: ['existing', 'new'], required: true },
  ageCategory: { type: String, trim: true },
  studentAge: { type: Number, min: 0, max: 120 },
  // No hard Mongoose `enum` — the dynamic teaching-subject catalog (services/
  // teachingSubject.service.js) means new valid values can be created at
  // runtime; services/assignment.service.js validates against the catalog
  // (async) before create/editAndResend instead.
  specialization: { type: String, trim: true, required: true },
  lessonDurationMinutes: { type: Number, enum: [30, 45, 60, 90], required: true },

  schedule: {
    days: { type: [ScheduleDaySchema], default: [] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'], default: 'weekly' },
    timezone: { type: String, default: null }, // null = academy default, same convention as TeacherWorkingHours
  },

  teachingType: { type: String, enum: ['individual', 'group'], default: 'individual' },
  adminNotes: { type: String, trim: true },

  // Message content — canonical data (above) is kept separate from this
  // editable communication text per the brief's explicit requirement.
  generatedMessage: { type: String },
  editedMessage: { type: String, default: null },
  sentMessage: { type: String, default: null }, // the exact text actually delivered, frozen for history

  status: { type: String, enum: ASSIGNMENT_STATUSES, default: 'draft' },
  teacherResponse: { type: TeacherResponseSchema, default: null },
  responseHistory: { type: [ResponseHistoryEntrySchema], default: [] },

  previousRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignmentRequest', default: null },
  replacementRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignmentRequest', default: null },

  immediateOverride: {
    enabled: { type: Boolean, default: false },
    reason: { type: String, trim: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date },
  },

  activationResult: {
    scheduleRuleIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'ScheduleRule', default: [] },
    sessionIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Session', default: [] },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    activatedAt: { type: Date },
  },

  // Idempotency/correlation key — supplied by the caller (the onboarding
  // wizard's clientRequestId, or a standalone create call's own key) so a
  // retried request can never create a second live assignment for the same
  // logical intent. Sparse: legacy/system-generated rows (e.g. the "new"
  // request created by reassign()) may not have one.
  correlationId: { type: String, default: null },

  cancelReason: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true })

AssignmentRequestSchema.index({ teacherId: 1, status: 1, createdAt: -1 })
AssignmentRequestSchema.index({ studentId: 1, status: 1, createdAt: -1 })
AssignmentRequestSchema.index({ status: 1, createdAt: -1 })
AssignmentRequestSchema.index(
  { correlationId: 1 },
  { unique: true, partialFilterExpression: { correlationId: { $type: 'string' } } }
)

module.exports = mongoose.model('AssignmentRequest', AssignmentRequestSchema)

const mongoose = require('mongoose')

const SessionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleRule' },
  titleAr: { type: String, required: true, trim: true },
  title: { type: String, trim: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'rescheduled', 'missed', 'no_show'],
    default: 'scheduled',
  },
  meetingLink: { type: String, trim: true },
  meetingProvider: { type: String, enum: ['zoom', 'meet', 'teams', 'other', 'custom'], default: 'zoom' },
  notes: { type: String },
  teacherNotes: { type: String },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  isException: { type: Boolean, default: false },
  isMakeup: { type: Boolean, default: false },
  rescheduledFrom: { type: Date },

  // Teacher attendance & performance tracking.
  // teacherStartedAt IS the platform check-in timestamp (teacher clicked
  // "join"/"check in" through the academy — it does NOT prove the teacher
  // actually joined the external Zoom/Meet/Teams call, only that they
  // declared readiness through the platform at this time).
  teacherStartedAt: { type: Date },
  teacherAttendanceStatus: {
    type: String,
    enum: ['pending', 'on_time', 'late', 'absent', 'excused'],
    default: 'pending',
  },
  teacherAttendanceMarkedBy: { type: String, enum: ['system', 'admin', 'teacher'] },
  teacherAttendanceNotes: { type: String },
  teacherLateMinutes: { type: Number, default: 0 },

  // Actual vs scheduled timing — a session may run later than planned
  // without that being a full reschedule (see attendancePolicy.js).
  actualStartAt: { type: Date },
  actualEndAt: { type: Date },
  delayMinutes: { type: Number, default: 0 },
  delayReasonCode: {
    type: String,
    enum: ['teacher_delay', 'student_delay', 'technical_issue', 'previous_session_overrun', 'mutual_agreement', 'emergency', 'other'],
  },
  delayNote: { type: String },

  // Session outcome — the explicit "what actually happened" confirmation,
  // distinct from the coarse lifecycle `status` above.
  outcome: {
    type: String,
    enum: [
      'pending_review', 'delivered', 'partially_delivered', 'teacher_absent',
      'cancelled_by_teacher', 'cancelled_by_admin', 'cancelled_by_student',
      'technical_issue', 'rescheduled', 'no_students_attended',
    ],
    default: 'pending_review',
  },

  // Evidence-only interaction events. A click is only a click — these are
  // NEVER treated as proof of external-meeting attendance.
  teacherLinkOpenedAt: { type: Date },
  studentLinkOpenedAt: { type: Date },

  // Attendance finalization (distinct from the auto-created draft on complete).
  attendanceFinalizedAt: { type: Date },
  attendanceFinalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Payroll-readiness — computed by default via sessionIntelligence.service.js,
  // but stored (not purely live-computed) so an admin correction is durable,
  // auditable, and doesn't silently recompute out from under a payroll run.
  // payrollStatusSetBy distinguishes the SOURCE (system-computed vs admin
  // override) from this STATE — deliberately not a 6th "adjusted" enum
  // value, since that would conflate "what the status is" with "who set
  // it." Once payrollStatusSetBy is 'admin', the system never silently
  // recomputes this field again (see session.controller.js applySystemPayrollStatus).
  payrollStatus: {
    type: String,
    enum: ['pending', 'payable', 'non_payable', 'pending_review', 'excluded'],
    default: 'pending',
  },
  payrollStatusReason: { type: String },
  payrollStatusSetBy: { type: String, enum: ['system', 'admin'], default: 'system' },
  payrollStatusSetAt: { type: Date },

  // Admin review lifecycle — decoupled from *why* a session was flagged
  // (that's computed live/deterministically, see sessionIntelligence.service.js
  // assessSessionReview) so a resolved/dismissed decision persists even
  // though the underlying evidence never changes. Unset/undefined is treated
  // as equivalent to 'open' by the review queue (no migration needed for
  // existing sessions — see docs/INTELLIGENT_ATTENDANCE_SYSTEM.md).
  reviewState: { type: String, enum: ['open', 'in_review', 'resolved', 'dismissed'] },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
}, { timestamps: true })

SessionSchema.index({ studentId: 1, scheduledAt: -1 })
SessionSchema.index({ teacherId: 1, scheduledAt: -1 })
SessionSchema.index({ scheduledAt: 1, status: 1 })
SessionSchema.index({ status: 1, createdAt: -1 })
SessionSchema.index({ teacherId: 1, teacherAttendanceStatus: 1 })
SessionSchema.index({ teacherId: 1, payrollStatus: 1 })
SessionSchema.index({ payrollStatus: 1, scheduledAt: -1 })
SessionSchema.index({ reviewState: 1, scheduledAt: -1 })

// Recurring-session dedupe guard (Phase 10): the same schedule rule can
// never legitimately produce two sessions at the exact same scheduledAt.
// Partial (only applies where seriesId exists) so ad-hoc/manual sessions —
// which have no seriesId — are never affected by this constraint.
SessionSchema.index(
  { seriesId: 1, scheduledAt: 1 },
  { unique: true, partialFilterExpression: { seriesId: { $exists: true } }, name: 'uniq_series_occurrence' }
)

module.exports = mongoose.model('Session', SessionSchema)

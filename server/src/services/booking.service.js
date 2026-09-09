const Session = require('../models/Session')

class BookingConflictError extends Error {
  constructor(message, conflictingSessionId) {
    super(message)
    this.name = 'BookingConflictError'
    this.statusCode = 409
    this.conflictingSessionId = conflictingSessionId
  }
}

// Sessions in these statuses no longer occupy the calendar — a cancelled or
// rescheduled-away session must never block a new booking at the same time.
const NON_BLOCKING_STATUSES = ['cancelled', 'rescheduled']

/**
 * Throws BookingConflictError if `teacherId` or `studentId` already has a
 * session overlapping [scheduledAt, scheduledAt + durationMinutes).
 * `excludeSessionId` lets reschedule checks ignore the session being moved.
 */
async function assertNoConflict({ teacherId, studentId, scheduledAt, durationMinutes = 60, excludeSessionId }) {
  const start = new Date(scheduledAt)
  const duration = Number(durationMinutes) || 60
  const end = new Date(start.getTime() + duration * 60000)

  const filter = {
    status: { $nin: NON_BLOCKING_STATUSES },
    $or: [{ teacherId }, { studentId }],
    // Overlap test: existingStart < newEnd AND existingEnd > newStart.
    scheduledAt: { $lt: end },
    $expr: {
      $gt: [
        { $add: ['$scheduledAt', { $multiply: [{ $ifNull: ['$durationMinutes', 60] }, 60000] }] },
        start,
      ],
    },
  }
  if (excludeSessionId) filter._id = { $ne: excludeSessionId }

  const conflict = await Session.findOne(filter).select('_id teacherId studentId scheduledAt')
  if (conflict) {
    throw new BookingConflictError('يوجد تعارض في الجدول — المعلم أو الطالب لديه حصة أخرى في نفس الوقت', conflict._id)
  }
}

module.exports = { assertNoConflict, BookingConflictError, NON_BLOCKING_STATUSES }

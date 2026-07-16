const Attendance = require('../models/Attendance')
const Session = require('../models/Session')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { syncSubscriptionConsumption } = require('./session.controller')

exports.getTeacherAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find({ teacherId: req.user._id })
      .sort({ recordedAt: -1 })
      .limit(100)
      .populate('studentId', 'firstNameAr lastNameAr avatar')
      .populate('sessionId', 'titleAr scheduledAt')
    sendSuccess(res, records)
  } catch (err) {
    next(err)
  }
}

// PATCH /attendance/:id — direct-by-id update. Ownership-checked: a teacher
// may only touch attendance records tied to their own sessions (previously
// this endpoint had no ownership check at all — a teacher who could guess/
// enumerate another teacher's Attendance _id could edit it).
exports.updateAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findById(req.params.id)
    if (!record) return sendError(res, 'سجل الحضور غير موجود', 404)
    if (req.user.role === 'teacher' && record.teacherId.toString() !== req.user._id.toString()) {
      return sendError(res, 'غير مصرح', 403)
    }

    const before = { status: record.status, notes: record.notes }
    if (req.body.status !== undefined) record.status = req.body.status
    if (req.body.notes !== undefined) record.notes = req.body.notes
    if (req.body.arrivalTime !== undefined) record.arrivalTime = req.body.arrivalTime ? new Date(req.body.arrivalTime) : null
    await record.save()

    // A correction to a completed session's attendance must resync session
    // consumption the exact same way completion itself does (present/late
    // consumes a purchased session, everything else gives it back).
    if (req.body.status !== undefined && req.body.status !== before.status) {
      const session = await Session.findById(record.sessionId).select('status subscriptionId studentId subscriptionConsumed')
      if (session && session.status === 'completed') {
        await syncSubscriptionConsumption(session, record.status)
        await session.save()
      }
    }

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'attendance.update',
      entity: 'Attendance', entityId: record._id, changes: { before, after: { status: record.status, notes: record.notes } }, ip: req.ip,
    })

    sendSuccess(res, record, 'تم تحديث سجل الحضور')
  } catch (err) {
    next(err)
  }
}

// Get attendance for a specific session
exports.getSessionAttendance = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.sessionId).select('studentId teacherId')
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    const record = await Attendance.findOne({
      sessionId: session._id,
      studentId: session.studentId,
    }).populate('studentId', 'firstNameAr lastNameAr avatar')

    sendSuccess(res, record || null)
  } catch (err) {
    next(err)
  }
}

// Create/update (draft) or finalize attendance for a specific session.
// `finalize: true` marks the record as the teacher's confirmed attendance
// (distinct from the auto-created 'present' default on session completion —
// see Session.completeSession) and stamps who/when finalized it, which also
// mirrors onto the parent Session for admin visibility/confidence scoring.
exports.saveSessionAttendance = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .select('studentId teacherId attendanceFinalizedAt status subscriptionId subscriptionConsumed')
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    if (req.user.role === 'teacher' && session.teacherId.toString() !== req.user._id.toString()) {
      return sendError(res, 'غير مصرح', 403)
    }

    const { status, notes, arrivalTime, finalize } = req.body
    if (!status) return sendError(res, 'status مطلوب', 400)

    const update = {
      sessionId: session._id,
      studentId: session.studentId,
      teacherId: session.teacherId,
      status,
      notes: notes || '',
      arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
      recordedAt: new Date(),
    }
    if (finalize) {
      update.isFinalized = true
      update.finalizedAt = new Date()
      update.finalizedBy = req.user._id
    }

    const record = await Attendance.findOneAndUpdate(
      { sessionId: session._id, studentId: session.studentId },
      update,
      { upsert: true, new: true }
    ).populate('studentId', 'firstNameAr lastNameAr')

    if (finalize) {
      session.attendanceFinalizedAt = update.finalizedAt
      session.attendanceFinalizedBy = req.user._id
    }

    // Resync session consumption if this session was already completed —
    // present/late consumes a purchased session, everything else gives it back.
    if (session.status === 'completed') {
      await syncSubscriptionConsumption(session, status)
    }
    if (finalize || session.status === 'completed') await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: finalize ? 'attendance.finalize' : 'attendance.save',
      entity: 'Attendance', entityId: record._id, changes: { status, finalize: !!finalize }, ip: req.ip,
    })

    sendSuccess(res, record, finalize ? 'تم اعتماد الحضور' : 'تم حفظ الحضور')
  } catch (err) {
    next(err)
  }
}

const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const User = require('../models/User')
const scheduleService = require('../services/schedule.service')
const { createNotification } = require('../services/notification.service')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')

// Preview session dates from rule params — no DB write
exports.previewRule = async (req, res, next) => {
  try {
    const { frequency, daysOfWeek, timeOfDay, startDate, endDate, sessionsTotal, skipDates } = req.body
    if (!startDate) return sendError(res, 'startDate مطلوب', 400)
    const dates = scheduleService.previewFromRule(
      { frequency, daysOfWeek, timeOfDay, startDate, endDate, sessionsTotal, skipDates },
      sessionsTotal || 20
    )
    sendSuccess(res, { dates, count: dates.length })
  } catch (err) {
    next(err)
  }
}

// Create a schedule rule and generate sessions from it
exports.createRule = async (req, res, next) => {
  try {
    const {
      studentId, subscriptionId, frequency, daysOfWeek, timeOfDay,
      durationMinutes, startDate, endDate, sessionsTotal,
      meetingLink, meetingProvider, titleTemplate, notes,
    } = req.body

    // An admin creating a schedule on a teacher's behalf must explicitly
    // name that teacher — defaulting to req.user._id here would silently
    // attribute the whole recurring series (and its payroll data) to the
    // admin instead of the teacher who actually teaches it.
    let teacherId = req.user._id
    if (req.user.role === 'admin') {
      if (!req.body.teacherId) return sendError(res, 'يجب تحديد المعلم عند إنشاء الجدول كإدارة', 400)
      teacherId = req.body.teacherId
    }

    if (!studentId) return sendError(res, 'studentId مطلوب', 400)
    if (!startDate) return sendError(res, 'startDate مطلوب', 400)

    const rule = await ScheduleRule.create({
      teacherId,
      studentId,
      subscriptionId,
      frequency: frequency || 'weekly',
      daysOfWeek: daysOfWeek || [],
      timeOfDay: timeOfDay || '18:00',
      durationMinutes: durationMinutes || 60,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      sessionsTotal: sessionsTotal || undefined,
      meetingLink: meetingLink || '',
      meetingProvider: meetingProvider || 'zoom',
      titleTemplate: titleTemplate || 'حصة',
      notes,
    })

    const sessions = await scheduleService.generateSessionsFromRule(rule)

    const student = await User.findById(studentId).select('firstNameAr lastNameAr')
    if (student) {
      await createNotification({
        userId: studentId,
        titleAr: 'تم إنشاء جدولك الدراسي',
        bodyAr: `تم إنشاء جدول حصصك الدراسية — ${sessions.length} حصة مجدولة`,
        type: 'schedule',
        priority: 'high',
        relatedId: rule._id,
      })
    }

    await rule.populate('studentId', 'firstNameAr lastNameAr avatar')

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.create',
      entity: 'ScheduleRule', entityId: rule._id,
      changes: { teacherId, studentId, sessionCount: sessions.length }, ip: req.ip,
    })

    sendSuccess(res, { rule, sessions, sessionCount: sessions.length }, 'تم إنشاء الجدول وتوليد الحصص بنجاح', 201)
  } catch (err) {
    next(err)
  }
}

// Get all schedule rules for the current teacher
exports.getMyRules = async (req, res, next) => {
  try {
    const rules = await ScheduleRule.find({ teacherId: req.user._id, status: { $ne: 'ended' } })
      .populate('studentId', 'firstNameAr lastNameAr avatar email')
      .populate('subscriptionId', 'status sessionsRemaining totalSessions endDate')
      .sort({ createdAt: -1 })

    // Add session stats per rule
    const enriched = await Promise.all(rules.map(async (rule) => {
      const [total, completed, upcoming] = await Promise.all([
        Session.countDocuments({ seriesId: rule._id }),
        Session.countDocuments({ seriesId: rule._id, status: 'completed' }),
        Session.findOne(
          { seriesId: rule._id, scheduledAt: { $gte: new Date() }, status: 'scheduled' },
          { scheduledAt: 1 }
        ).sort({ scheduledAt: 1 }),
      ])
      return {
        ...rule.toObject(),
        stats: { total, completed, nextSession: upcoming?.scheduledAt || null },
      }
    }))

    sendSuccess(res, enriched)
  } catch (err) {
    next(err)
  }
}

// Get a single rule with its upcoming sessions
exports.getRule = async (req, res, next) => {
  try {
    const rule = await ScheduleRule.findOne({ _id: req.params.id })
      .populate('studentId', 'firstNameAr lastNameAr avatar email')
    if (!rule) return sendError(res, 'الجدول غير موجود', 404)

    const [total, completed, upcomingSessions] = await Promise.all([
      Session.countDocuments({ seriesId: rule._id }),
      Session.countDocuments({ seriesId: rule._id, status: 'completed' }),
      Session.find({ seriesId: rule._id, scheduledAt: { $gte: new Date() }, status: 'scheduled' })
        .sort({ scheduledAt: 1 }).limit(5),
    ])

    sendSuccess(res, { rule, stats: { total, completed, upcomingSessions } })
  } catch (err) {
    next(err)
  }
}

// Update rule (meeting link, pause/resume, notes). Admins have full
// authority over ANY teacher's rule, including recurrence changes and
// reassigning the teacher/student — teachers keep editing only their own,
// and only the operational fields (link/status/notes/time).
exports.updateRule = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, teacherId: req.user._id }
    const rule = await ScheduleRule.findOne(filter)
    if (!rule) return sendError(res, 'الجدول غير موجود', 404)

    const {
      meetingLink, meetingProvider, status, notes, timeOfDay,
      frequency, daysOfWeek, durationMinutes, teacherId, studentId,
    } = req.body
    if (meetingLink !== undefined) rule.meetingLink = meetingLink
    if (meetingProvider !== undefined) rule.meetingProvider = meetingProvider
    if (status !== undefined) rule.status = status
    if (notes !== undefined) rule.notes = notes
    if (timeOfDay !== undefined) rule.timeOfDay = timeOfDay

    // Recurrence pattern + teacher/student reassignment — admin-only, a
    // teacher cannot reassign their own students/schedule to someone else.
    if (isAdmin) {
      if (frequency !== undefined) rule.frequency = frequency
      if (daysOfWeek !== undefined) rule.daysOfWeek = daysOfWeek
      if (durationMinutes !== undefined) rule.durationMinutes = durationMinutes
      if (teacherId !== undefined) rule.teacherId = teacherId
      if (studentId !== undefined) rule.studentId = studentId
    }

    await rule.save()

    // Keep not-yet-happened generated sessions in sync with the rule — past
    // sessions (history/payroll data) are never rewritten.
    const futureUpdate = {}
    if (meetingLink !== undefined) { futureUpdate.meetingLink = meetingLink; futureUpdate.meetingProvider = meetingProvider || rule.meetingProvider }
    if (isAdmin && teacherId !== undefined) futureUpdate.teacherId = teacherId
    if (isAdmin && studentId !== undefined) futureUpdate.studentId = studentId
    if (Object.keys(futureUpdate).length) {
      await Session.updateMany(
        { seriesId: rule._id, status: 'scheduled', scheduledAt: { $gte: new Date() } },
        futureUpdate
      )
    }

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.update',
      entity: 'ScheduleRule', entityId: rule._id, changes: req.body, ip: req.ip,
    })

    sendSuccess(res, rule, 'تم تحديث الجدول')
  } catch (err) {
    next(err)
  }
}

// Generate additional sessions for an existing rule (extend). Admin can do
// this for any teacher's rule.
exports.generateMore = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, teacherId: req.user._id }
    const rule = await ScheduleRule.findOne(filter)
    if (!rule) return sendError(res, 'الجدول غير موجود', 404)

    if (req.body.startDate) rule.startDate = new Date(req.body.startDate)
    if (req.body.endDate) rule.endDate = new Date(req.body.endDate)
    if (req.body.sessionsTotal) rule.sessionsTotal = Number(req.body.sessionsTotal)
    await rule.save()

    const sessions = await scheduleService.generateSessionsFromRule(rule)

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.generate_more',
      entity: 'ScheduleRule', entityId: rule._id, changes: { sessionCount: sessions.length }, ip: req.ip,
    })

    sendSuccess(res, { sessions, count: sessions.length }, `تم توليد ${sessions.length} حصة إضافية`)
  } catch (err) {
    next(err)
  }
}

// Delete a rule — teacher can delete their own, admin can delete any.
// Preserves history: only removes sessions that haven't happened yet.
exports.deleteRule = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, teacherId: req.user._id }
    const rule = await ScheduleRule.findOne(filter)
    if (!rule) return sendError(res, 'الجدول غير موجود', 404)

    const removed = await Session.deleteMany({
      seriesId: rule._id, status: 'scheduled', scheduledAt: { $gte: new Date() },
    })
    await ScheduleRule.deleteOne({ _id: rule._id })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'schedule_rule.delete',
      entity: 'ScheduleRule', entityId: rule._id,
      changes: { removedFutureSessions: removed.deletedCount }, ip: req.ip,
    })

    sendSuccess(res, null, 'تم حذف الجدول')
  } catch (err) {
    next(err)
  }
}

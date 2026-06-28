const ScheduleRule = require('../models/ScheduleRule')
const Session = require('../models/Session')
const User = require('../models/User')
const scheduleService = require('../services/schedule.service')
const { createNotification } = require('../services/notification.service')
const { sendSuccess, sendError } = require('../utils/response')

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
    const teacherId = req.user._id
    const {
      studentId, subscriptionId, frequency, daysOfWeek, timeOfDay,
      durationMinutes, startDate, endDate, sessionsTotal,
      meetingLink, meetingProvider, titleTemplate, notes,
    } = req.body

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

// Update rule (meeting link, pause/resume, notes)
exports.updateRule = async (req, res, next) => {
  try {
    const rule = await ScheduleRule.findOne({ _id: req.params.id, teacherId: req.user._id })
    if (!rule) return sendError(res, 'الجدول غير موجود', 404)

    const { meetingLink, meetingProvider, status, notes, timeOfDay } = req.body
    if (meetingLink !== undefined) rule.meetingLink = meetingLink
    if (meetingProvider !== undefined) rule.meetingProvider = meetingProvider
    if (status !== undefined) rule.status = status
    if (notes !== undefined) rule.notes = notes
    if (timeOfDay !== undefined) rule.timeOfDay = timeOfDay

    await rule.save()

    if (meetingLink !== undefined) {
      await Session.updateMany(
        { seriesId: rule._id, status: 'scheduled', scheduledAt: { $gte: new Date() } },
        { meetingLink, meetingProvider: meetingProvider || rule.meetingProvider }
      )
    }

    sendSuccess(res, rule, 'تم تحديث الجدول')
  } catch (err) {
    next(err)
  }
}

// Generate additional sessions for an existing rule (extend)
exports.generateMore = async (req, res, next) => {
  try {
    const rule = await ScheduleRule.findOne({ _id: req.params.id, teacherId: req.user._id })
    if (!rule) return sendError(res, 'الجدول غير موجود', 404)

    if (req.body.startDate) rule.startDate = new Date(req.body.startDate)
    if (req.body.endDate) rule.endDate = new Date(req.body.endDate)
    if (req.body.sessionsTotal) rule.sessionsTotal = Number(req.body.sessionsTotal)
    await rule.save()

    const sessions = await scheduleService.generateSessionsFromRule(rule)
    sendSuccess(res, { sessions, count: sessions.length }, `تم توليد ${sessions.length} حصة إضافية`)
  } catch (err) {
    next(err)
  }
}

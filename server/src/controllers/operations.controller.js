// Admin Operations Center backend — the layer that turns the existing,
// already-computed session/attendance/payroll intelligence into an
// actionable "what's happening now and what needs me" view, instead of it
// staying hidden behind per-teacher drill-downs.
//
// Query design note: every endpoint here bounds its date range explicitly
// (today for the live summary, a capped window for the timeline/review
// queue) rather than scanning the full historical Session collection, and
// review/confidence assessment is computed in application code only over
// that bounded, already-fetched set — never as a second per-row query.

const Session = require('../models/Session')
const Attendance = require('../models/Attendance')
const Subscription = require('../models/Subscription')
const { getSessionWindow } = require('../config/attendancePolicy')
const { assessSessionReview, computeConfidence, SEVERITY_RANK } = require('../services/sessionIntelligence.service')
const { logAction } = require('../services/audit.service')
const { getOnlineCounts } = require('../services/socket.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination } = require('../utils/pagination')

const MAX_RANGE_DAYS = 31
const DEFAULT_REVIEW_WINDOW_DAYS = 14
const CANDIDATE_HARD_CAP = 1000

const TIMELINE_SELECT = 'titleAr scheduledAt durationMinutes status outcome meetingLink meetingProvider ' +
  'teacherAttendanceStatus teacherLateMinutes teacherStartedAt teacherLinkOpenedAt studentLinkOpenedAt ' +
  'payrollStatus payrollStatusReason attendanceFinalizedAt reviewState reviewedAt teacherId studentId'

function clampRange(fromInput, toInput, defaultDaysBack, defaultDaysForward = 0) {
  const now = new Date()
  let from = fromInput ? new Date(fromInput) : new Date(now.getTime() - defaultDaysBack * 86400000)
  let to = toInput ? new Date(toInput) : new Date(now.getTime() + defaultDaysForward * 86400000)
  const maxMs = MAX_RANGE_DAYS * 86400000
  if (to.getTime() - from.getTime() > maxMs) from = new Date(to.getTime() - maxMs)
  return { from, to }
}

// GET /operations/live — compact "what's happening today" summary, powers
// both the Admin Dashboard widget and the Operations Center's header.
exports.getLiveSummary = async (req, res, next) => {
  try {
    const now = new Date()
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)

    const today = await Session.find({ scheduledAt: { $gte: dayStart, $lte: dayEnd } })
      .select(TIMELINE_SELECT)
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
      .populate('studentId', 'firstNameAr lastNameAr avatar')
      .sort({ scheduledAt: 1 })

    const buckets = {
      liveNow: [], startingSoon: [], missingCheckIn: [], missingLink: [],
      lateTeachers: [], attendancePending: [], recentlyCompleted: [], cancelledOrRescheduled: [],
      noShow: [],
    }

    // Teacher on-time rate — computed only over today's sessions where the
    // teacher's attendance has actually been resolved one way or another
    // (pending check-ins are excluded, not counted as "late").
    let teacherResolvedCount = 0, teacherOnTimeCount = 0

    for (const s of today) {
      const window = getSessionWindow(s.scheduledAt, s.durationMinutes, now)
      if (s.status === 'ongoing') buckets.liveNow.push(s)
      if (s.status === 'scheduled' && window.phase === 'pre_session') buckets.startingSoon.push(s)
      if (s.status === 'scheduled' && s.teacherAttendanceStatus === 'pending' &&
          ['in_progress', 'grace_period', 'extended_completion', 'overdue'].includes(window.phase)) {
        buckets.missingCheckIn.push(s)
      }
      if (!s.meetingLink && s.status === 'scheduled' && ['pre_session', 'in_progress'].includes(window.phase)) {
        buckets.missingLink.push(s)
      }
      if (s.teacherAttendanceStatus === 'late') buckets.lateTeachers.push(s)
      if (s.status === 'completed' && !s.attendanceFinalizedAt) buckets.attendancePending.push(s)
      if (s.status === 'completed') buckets.recentlyCompleted.push(s)
      if (['cancelled', 'rescheduled'].includes(s.status)) buckets.cancelledOrRescheduled.push(s)
      if (s.status === 'no_show') buckets.noShow.push(s)

      if (['on_time', 'late', 'absent'].includes(s.teacherAttendanceStatus)) {
        teacherResolvedCount++
        if (s.teacherAttendanceStatus === 'on_time') teacherOnTimeCount++
      }
    }

    const todaySessionIds = today.map(s => s._id)

    // Payroll/review counts intentionally look a bit further back than
    // "today" — a session flagged three days ago still needs attention.
    const reviewFrom = new Date(now.getTime() - DEFAULT_REVIEW_WINDOW_DAYS * 86400000)
    const [payrollReviewCount, reviewCandidates, todayAttendance, revenueTodayAgg] = await Promise.all([
      Session.countDocuments({ payrollStatus: 'pending_review' }),
      Session.find({ scheduledAt: { $gte: reviewFrom, $lte: now }, reviewState: { $nin: ['resolved', 'dismissed'] } })
        .select(TIMELINE_SELECT).limit(CANDIDATE_HARD_CAP),
      // Today's finalized student attendance — powers both the absence count
      // and the attendance-rate metric from real records, not an assumption.
      Attendance.find({ sessionId: { $in: todaySessionIds } }).select('status'),
      Subscription.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, sum: { $sum: '$amountPaid' } } },
      ]),
    ])

    let criticalCount = 0, highCount = 0, needsReviewCount = 0
    for (const s of reviewCandidates) {
      const assessment = assessSessionReview(s)
      if (!assessment) continue
      needsReviewCount++
      if (assessment.severity === 'critical') criticalCount++
      else if (assessment.severity === 'high') highCount++
    }

    const studentAbsencesToday = todayAttendance.filter(a => a.status === 'absent').length
    const attendedToday = todayAttendance.filter(a => ['present', 'late'].includes(a.status)).length
    const attendanceRateToday = todayAttendance.length ? Math.round((attendedToday / todayAttendance.length) * 100) : null
    const teacherOnTimeRateToday = teacherResolvedCount ? Math.round((teacherOnTimeCount / teacherResolvedCount) * 100) : null
    const onlineNow = getOnlineCounts()

    sendSuccess(res, {
      counts: {
        liveNow: buckets.liveNow.length,
        startingSoon: buckets.startingSoon.length,
        missingCheckIn: buckets.missingCheckIn.length,
        missingLink: buckets.missingLink.length,
        lateTeachers: buckets.lateTeachers.length,
        attendancePending: buckets.attendancePending.length,
        recentlyCompleted: buckets.recentlyCompleted.length,
        cancelledOrRescheduled: buckets.cancelledOrRescheduled.length,
        noShow: buckets.noShow.length,
        payrollReviewCount,
        needsReviewCount,
        criticalReviewCount: criticalCount,
        highReviewCount: highCount,
        studentAbsencesToday,
      },
      health: {
        attendanceRateToday,
        teacherOnTimeRateToday,
        revenueToday: revenueTodayAgg[0]?.sum || 0,
        onlineNow,
      },
      sections: {
        liveNow: buckets.liveNow.slice(0, 10),
        startingSoon: buckets.startingSoon.slice(0, 10),
        missingCheckIn: buckets.missingCheckIn.slice(0, 10),
        missingLink: buckets.missingLink.slice(0, 10),
        lateTeachers: buckets.lateTeachers.slice(0, 10),
        attendancePending: buckets.attendancePending.slice(0, 10),
        noShow: buckets.noShow.slice(0, 10),
      },
    })
  } catch (err) { next(err) }
}

// GET /operations/timeline — chronological, filterable list of sessions
// with their computed operational state attached (no separate per-row query).
exports.getTimeline = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const { date, teacherId, status, payrollStatus, needsReview } = req.query

    let filter
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0)
      const dEnd = new Date(date); dEnd.setHours(23, 59, 59, 999)
      filter = { scheduledAt: { $gte: d, $lte: dEnd } }
    } else {
      const { from, to } = clampRange(req.query.dateFrom, req.query.dateTo, 3, 3)
      filter = { scheduledAt: { $gte: from, $lte: to } }
    }
    if (teacherId) filter.teacherId = teacherId
    if (status) filter.status = status
    if (payrollStatus) filter.payrollStatus = payrollStatus

    const sessions = await Session.find(filter)
      .select(TIMELINE_SELECT)
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
      .populate('studentId', 'firstNameAr lastNameAr avatar')
      .sort({ scheduledAt: 1 })
      .limit(CANDIDATE_HARD_CAP)

    const now = new Date()
    let annotated = sessions.map(s => {
      const obj = s.toObject()
      obj.window = getSessionWindow(s.scheduledAt, s.durationMinutes, now)
      obj.reviewAssessment = assessSessionReview(s)
      // Confidence is surfaced here (not just computed and left backend-only)
      // using the Session-level attendanceFinalizedAt mirror as a stand-in
      // for a real Attendance doc, avoiding an N+1 query per timeline row —
      // attendance.controller.js keeps that field in sync whenever
      // attendance is actually finalized, so this loses no real signal.
      obj.confidence = computeConfidence(s, s.attendanceFinalizedAt ? { isFinalized: true } : null)
      return obj
    })

    if (needsReview === 'true') annotated = annotated.filter(s => !!s.reviewAssessment)

    const total = annotated.length
    const paged = annotated.slice(skip, skip + limit)
    sendPaginated(res, paged, total, page, limit)
  } catch (err) { next(err) }
}

// GET /operations/review-queue — the Needs Review queue, sorted by
// severity then recency. Bounded by date range (default last 14 days) to
// keep the in-memory assessment pass reasonably sized.
exports.getReviewQueue = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const { severity } = req.query
    const { from, to } = clampRange(req.query.from, req.query.to, DEFAULT_REVIEW_WINDOW_DAYS, 0)

    const candidates = await Session.find({
      scheduledAt: { $gte: from, $lte: to },
      reviewState: { $nin: ['resolved', 'dismissed'] },
    })
      .select(TIMELINE_SELECT)
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
      .populate('studentId', 'firstNameAr lastNameAr avatar')
      .sort({ scheduledAt: -1 })
      .limit(CANDIDATE_HARD_CAP)

    let assessed = candidates
      .map(s => {
        const assessment = assessSessionReview(s)
        return assessment ? { session: s, severity: assessment.severity, reasons: assessment.reasons } : null
      })
      .filter(Boolean)

    if (severity) assessed = assessed.filter(item => item.severity === severity)

    assessed.sort((a, b) => {
      const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      if (rankDiff !== 0) return rankDiff
      return new Date(b.session.scheduledAt) - new Date(a.session.scheduledAt)
    })

    const total = assessed.length
    const paged = assessed.slice(skip, skip + limit)
    sendPaginated(res, paged, total, page, limit)
  } catch (err) { next(err) }
}

const REVIEW_ACTIONS = {
  start_review: 'in_review',
  resolve: 'resolved',
  dismiss: 'dismissed',
  reopen: 'open',
}

// PATCH /operations/review/:sessionId — admin acts on a flagged session.
// This only changes review lifecycle state; correcting the underlying
// attendance/payroll fields still goes through the existing, already
// audit-logged teacher-performance correction endpoint — kept as two
// separate, composable actions rather than inventing a new combined one.
exports.actOnReview = async (req, res, next) => {
  try {
    const { action, note } = req.body
    const newState = REVIEW_ACTIONS[action]
    if (!newState) return sendError(res, 'إجراء غير صالح', 400)

    const session = await Session.findById(req.params.sessionId)
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)

    session.reviewState = newState
    session.reviewedBy = req.user._id
    session.reviewedAt = new Date()
    if (note !== undefined) session.reviewNote = note
    await session.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: `review.${action}`,
      entity: 'Session', entityId: session._id, changes: { reviewState: newState, note }, ip: req.ip,
    })

    sendSuccess(res, session, 'تم تحديث حالة المراجعة')
  } catch (err) { next(err) }
}

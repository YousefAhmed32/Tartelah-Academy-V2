const Session = require('../models/Session')
const mongoose = require('mongoose')
const { fromZonedTime, formatInTimeZone } = require('date-fns-tz')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

let User
try {
  User = require('../models/User')
} catch (_) {}

function buildSessionTitle(titleTemplate, studentName, index, total) {
  let displayIndex = index
  if (total && total > 0 && index > 0) {
    displayIndex = ((index - 1) % total) + 1
  }
  const countStr = total ? `${displayIndex} من ${total}` : `${displayIndex}`
  if (studentName) {
    return total ? `${studentName} ${countStr}` : `${studentName} ${displayIndex}`
  }
  const template = titleTemplate || 'حصة'
  return `${template} ${index}`
}

function pad2(n) { return String(n).padStart(2, '0') }

/**
 * Generates an array of scheduled Date objects based on a ScheduleRule definition.
 * Supports: daily, weekly, biweekly, monthly, custom.
 */
function generateDates(rule, overrideLimit) {
  const {
    frequency = 'weekly',
    daysOfWeek = [],
    timeOfDay = '18:00',
    startDate,
    endDate,
    sessionsTotal,
    skipDates = [],
    timezone = DEFAULT_ACADEMY_TIMEZONE,
  } = rule

  const skipSet = new Set(skipDates.map(d => new Date(d).toDateString()))
  const maxCount = overrideLimit || sessionsTotal || 50
  const maxDate = endDate ? new Date(endDate) : null

  const dates = []
  const cur = new Date(startDate)
  cur.setHours(0, 0, 0, 0)

  // For biweekly: track the Sunday of the start week
  const startSunday = new Date(cur)
  startSunday.setDate(startSunday.getDate() - startSunday.getDay())

  let safety = 0
  while (dates.length < maxCount && safety++ < 600) {
    if (maxDate && cur > maxDate) break

    const dow = cur.getDay()
    let include = false

    if (frequency === 'daily') {
      include = true
    } else if (frequency === 'weekly') {
      include = daysOfWeek.length === 0 ? true : daysOfWeek.includes(dow)
    } else if (frequency === 'biweekly') {
      const weekNum = Math.floor((cur - startSunday) / (7 * 24 * 60 * 60 * 1000))
      include = daysOfWeek.includes(dow) && weekNum % 2 === 0
    } else if (frequency === 'monthly') {
      include = daysOfWeek.length > 0
        ? daysOfWeek.includes(dow)
        : cur.getDate() === new Date(startDate).getDate()
    } else {
      // custom: treat like weekly with explicit daysOfWeek
      include = daysOfWeek.includes(dow)
    }

    if (include && !skipSet.has(cur.toDateString())) {
      // The calendar day itself is walked in local/server time above (day-of-
      // week matching doesn't shift meaningfully across the academy's
      // supported timezones), but the actual clock TIME must be interpreted
      // in the rule's own timezone — not the server's — or a "6pm Cairo"
      // rule silently becomes 6pm-wherever-the-server-happens-to-run.
      const dateStr = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())} ${timeOfDay}`
      dates.push(fromZonedTime(dateStr, timezone || DEFAULT_ACADEMY_TIMEZONE))
    }

    cur.setDate(cur.getDate() + 1)
  }

  return dates
}

/**
 * Returns preview dates (no DB write).
 */
exports.previewFromRule = (ruleData, limitCount = 20) => {
  return generateDates(ruleData, limitCount)
}

/**
 * Generates Session documents from a ScheduleRule.
 *
 * Idempotent by design (Phase 10 — recurring-session dedupe): a `{seriesId,
 * scheduledAt}` unique index exists on Session (see models/Session.js), and
 * this function upserts on that same key via `$setOnInsert` rather than
 * `insertMany`. Calling this twice with the same rule and overlapping date
 * ranges — whether from a genuine double-click, a retried request, or two
 * near-simultaneous calls racing each other — can never create duplicate
 * occurrences: MongoDB's unique index is the actual safety net, not just
 * the application-level `existing` check below (which exists only to keep
 * the human-facing title numbering, e.g. "حصة 9", continuous across
 * multiple generation calls — it is not relied on for correctness).
 *
 * A legitimate reschedule is unaffected: reschedule mutates a single
 * existing Session's `scheduledAt` field directly (see
 * session.controller.js `rescheduleSession`) rather than going through
 * this generation path, so it never collides with this index.
 */
exports.generateSessionsFromRule = async (rule) => {
  const dates = generateDates(rule)
  if (!dates.length) return []

  let studentName = ''
  if (rule.studentId && typeof rule.studentId === 'object' && rule.studentId.firstNameAr) {
    studentName = `${rule.studentId.firstNameAr} ${rule.studentId.lastNameAr || ''}`.trim()
  } else if (rule.studentName) {
    studentName = rule.studentName
  } else if (rule.studentId && mongoose.connection?.readyState === 1 && User) {
    try {
      const student = await User.findById(rule.studentId).select('firstNameAr lastNameAr name').lean()
      if (student) {
        studentName = student.firstNameAr
          ? `${student.firstNameAr} ${student.lastNameAr || ''}`.trim()
          : (student.name || '')
      }
    } catch (_) {}
  }

  // 1. Resolve Subscription (use rule.subscriptionId or auto-detect active subscription)
  let sub = null
  let resolvedSubscriptionId = rule.subscriptionId
  if (mongoose.connection?.readyState === 1) {
    try {
      const Subscription = mongoose.model('Subscription')
      if (resolvedSubscriptionId) {
        sub = await Subscription.findById(resolvedSubscriptionId)
          .select('totalSessions packageId status studentId teacherId walletTransactionId sessionsRemaining')
          .populate('packageId', 'sessionsPerMonth nameAr')
          .lean()
      }
      if (!sub && rule.studentId) {
        const subFilter = { studentId: rule.studentId, status: 'active' }
        if (rule.teacherId) {
          sub = await Subscription.findOne({ ...subFilter, teacherId: rule.teacherId })
            .sort({ createdAt: -1 })
            .select('totalSessions packageId status studentId teacherId walletTransactionId sessionsRemaining')
            .populate('packageId', 'sessionsPerMonth nameAr')
            .lean()
        }
        if (!sub) {
          sub = await Subscription.findOne(subFilter)
            .sort({ createdAt: -1 })
            .select('totalSessions packageId status studentId teacherId walletTransactionId sessionsRemaining')
            .populate('packageId', 'sessionsPerMonth nameAr')
            .lean()
        }
        if (sub?._id) {
          resolvedSubscriptionId = sub._id
          if (rule._id) {
            const ScheduleRule = mongoose.model('ScheduleRule')
            await ScheduleRule.updateOne({ _id: rule._id }, { $set: { subscriptionId: sub._id } }).catch(() => {})
          }
        }
      }
    } catch (_) {}
  }

  // 2. Resolve totalCount (denominator in "X من Y")
  let totalCount = rule.sessionsTotal || 0
  if (sub) {
    if (sub.packageId?.sessionsPerMonth) {
      totalCount = sub.packageId.sessionsPerMonth
    } else if (sub.totalSessions) {
      totalCount = sub.totalSessions
    }
  } else if (rule.startingSessionNumber && Number(rule.startingSessionNumber) > 1 && totalCount > 0 && totalCount < Number(rule.startingSessionNumber)) {
    // If startingSessionNumber is 11 and sessionsTotal is 6, the actual total denominator is 10 + 6 = 16
    totalCount = (Number(rule.startingSessionNumber) - 1) + totalCount
  }

  // 3. Resolve starting offset (consumed lessons or explicit startingSessionNumber)
  let priorOffset = 0
  if (rule.startingSessionNumber && Number(rule.startingSessionNumber) > 1) {
    priorOffset = Number(rule.startingSessionNumber) - 1
  } else if (sub && mongoose.connection?.readyState === 1) {
    try {
      const seriesFilter = rule._id ? { seriesId: { $ne: rule._id } } : {}
      const consumedCount = await Session.countDocuments({
        subscriptionId: sub._id,
        $or: [{ subscriptionConsumed: true }, { status: 'completed' }],
        ...seriesFilter,
      })

      let openingUsed = 0
      if (sub.walletTransactionId) {
        const LessonTransaction = mongoose.model('LessonTransaction')
        const tx = await LessonTransaction.findById(sub.walletTransactionId).select('metadata').lean()
        if (tx?.metadata?.lessonsUsedAtOpening) {
          openingUsed = Number(tx.metadata.lessonsUsedAtOpening)
        }
      }

      priorOffset = Math.max(consumedCount, openingUsed)
    } catch (_) {}
  }

  const existingFilter = { seriesId: rule._id }
  if (resolvedSubscriptionId) {
    existingFilter.subscriptionId = resolvedSubscriptionId
  }
  const existing = await Session.countDocuments(existingFilter)
  const baseIndex = priorOffset + existing

  let resolvedLink = rule.meetingLink || ''
  let resolvedProvider = rule.meetingProvider || 'zoom'
  if (!resolvedLink && rule.teacherId && mongoose.connection?.readyState === 1 && User) {
    try {
      const teacherUser = await User.findById(rule.teacherId).select('meetingLinks').lean()
      if (teacherUser?.meetingLinks?.[0]?.link) {
        resolvedLink = teacherUser.meetingLinks[0].link
        resolvedProvider = teacherUser.meetingLinks[0].provider || resolvedProvider
      }
    } catch (_) {}
  }

  const ops = dates.map((date, i) => ({
    updateOne: {
      filter: { seriesId: rule._id, scheduledAt: date },
      update: {
        $setOnInsert: {
          teacherId: rule.teacherId,
          studentId: rule.studentId,
          subscriptionId: resolvedSubscriptionId,
          seriesId: rule._id,
          titleAr: buildSessionTitle(rule.titleTemplate, studentName, baseIndex + i + 1, totalCount),
          title: buildSessionTitle(rule.titleTemplate, studentName, baseIndex + i + 1, totalCount),
          scheduledAt: date,
          durationMinutes: rule.durationMinutes || 60,
          meetingLink: resolvedLink,
          meetingProvider: resolvedProvider,
          status: 'scheduled',
        },
      },
      upsert: true,
    },
  }))

  const result = await Session.bulkWrite(ops, { ordered: false })

  // Only return the sessions actually newly inserted by this call (not
  // pre-existing ones the upsert matched-and-skipped) — matches the old
  // insertMany's return semantics that callers (schedule-rule controller,
  // notifications) depend on for an accurate "N sessions generated" count.
  const insertedIds = Object.values(result.upsertedIds || {})
  if (!insertedIds.length) return []
  return Session.find({ _id: { $in: insertedIds } }).sort({ scheduledAt: 1 })
}

/**
 * Synchronizes future not-yet-completed sessions for a ScheduleRule whenever
 * operational parameters like timeOfDay, durationMinutes, meetingLink, etc. change.
 */
async function syncFutureSessionsForRule(rule) {
  if (!rule?._id) return { updatedCount: 0 }

  const tz = rule.timezone || DEFAULT_ACADEMY_TIMEZONE
  const todayStr = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd')
  const startOfToday = fromZonedTime(`${todayStr} 00:00:00`, tz)

  const futureSessions = await Session.find({
    seriesId: rule._id,
    status: 'scheduled',
    // Look for sessions that haven't been completed or cancelled, starting from beginning of today
    scheduledAt: { $gte: startOfToday },
  })

  let updatedCount = 0

  for (const session of futureSessions) {
    let modified = false

    if (!session.isException && rule.timeOfDay) {
      try {
        const dayStr = formatInTimeZone(session.scheduledAt, tz, 'yyyy-MM-dd')
        const targetTimeStr = `${dayStr} ${rule.timeOfDay}`
        const newScheduledAt = fromZonedTime(targetTimeStr, tz)
        if (session.scheduledAt.getTime() !== newScheduledAt.getTime()) {
          session.scheduledAt = newScheduledAt
          modified = true
        }
      } catch (_) {}
    }

    if (rule.durationMinutes && session.durationMinutes !== rule.durationMinutes) {
      session.durationMinutes = rule.durationMinutes
      modified = true
    }

    if (rule.meetingLink && session.meetingLink !== rule.meetingLink) {
      session.meetingLink = rule.meetingLink
      session.meetingProvider = rule.meetingProvider || session.meetingProvider
      modified = true
    }

    if (rule.teacherId && String(session.teacherId) !== String(rule.teacherId)) {
      session.teacherId = rule.teacherId
      modified = true
    }

    if (rule.studentId && String(session.studentId) !== String(rule.studentId)) {
      session.studentId = rule.studentId
      modified = true
    }

    if (modified) {
      await session.save()
      updatedCount++
    }
  }

  return { updatedCount }
}

exports.syncFutureSessionsForRule = syncFutureSessionsForRule
exports.buildSessionTitle = buildSessionTitle

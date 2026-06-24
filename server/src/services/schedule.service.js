const Session = require('../models/Session')

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
  } = rule

  const [hours = 18, minutes = 0] = timeOfDay.split(':').map(Number)
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
      const sessionDate = new Date(cur)
      sessionDate.setHours(hours, minutes, 0, 0)
      dates.push(new Date(sessionDate))
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
 * Generates Session documents from a ScheduleRule and inserts them.
 * Supports extending an existing series — existing sessions are counted
 * for title numbering but not duplicated (dates already past are handled
 * by the caller updating startDate before calling this again).
 */
exports.generateSessionsFromRule = async (rule) => {
  const dates = generateDates(rule)
  if (!dates.length) return []

  const existing = await Session.countDocuments({ seriesId: rule._id })

  const sessions = dates.map((date, i) => ({
    teacherId: rule.teacherId,
    studentId: rule.studentId,
    subscriptionId: rule.subscriptionId,
    seriesId: rule._id,
    titleAr: `${rule.titleTemplate || 'حصة'} ${existing + i + 1}`,
    scheduledAt: date,
    durationMinutes: rule.durationMinutes || 60,
    meetingLink: rule.meetingLink || '',
    meetingProvider: rule.meetingProvider || 'zoom',
    status: 'scheduled',
  }))

  return Session.insertMany(sessions)
}

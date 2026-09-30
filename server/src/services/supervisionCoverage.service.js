const Assignment = require('../models/SupervisionAssignment')
const CohortMember = require('../models/SupervisionCohortMember')
const Session = require('../models/Session')

const id = (value) => String(value?._id || value || '')
const activeAt = (row, at) => row.startsAt <= at && (!row.endsAt || row.endsAt > at)

function resolveOwner(session, assignments, memberships) {
  const at = new Date(session.scheduledAt)
  const studentId = id(session.studentId)
  const teacherIds = [id(session.teacherId), id(session.supervisionOriginalTeacherId)].filter(Boolean)
  const cohortIds = new Set(memberships.filter((row) => id(row.studentId) === studentId && activeAt(row, at)).map((row) => id(row.cohortId)))
  const matches = assignments.filter((row) => {
    if (!activeAt(row, at)) return false
    const scope = row.scopeType || 'teacher'
    if (scope === 'student') return id(row.studentId) === studentId && teacherIds.includes(id(row.teacherId))
    if (scope === 'cohort') return cohortIds.has(id(row.cohortId))
    return teacherIds.includes(id(row.teacherId))
  })
  matches.sort((a, b) => {
    const rank = (row) => ({ student: 3, cohort: 2, teacher: 1 })[row.scopeType || 'teacher']
    return rank(b) - rank(a) || Number(!!b.primary) - Number(!!a.primary) || b.startsAt - a.startsAt || id(a._id).localeCompare(id(b._id))
  })
  return matches[0] || null
}

async function loadCoverage(team, sessions) {
  if (!sessions.length) return { assignments: [], memberships: [] }
  const from = new Date(Math.min(...sessions.map((row) => new Date(row.scheduledAt).getTime())))
  const to = new Date(Math.max(...sessions.map((row) => new Date(row.scheduledAt).getTime())) + 1)
  const teacherIds = [...new Set(sessions.flatMap((row) => [id(row.teacherId), id(row.supervisionOriginalTeacherId)]).filter(Boolean))]
  const studentIds = [...new Set(sessions.map((row) => id(row.studentId)).filter(Boolean))]
  const memberships = studentIds.length ? await CohortMember.find({ team, studentId: { $in: studentIds }, startsAt: { $lt: to }, $or: [{ endsAt: null }, { endsAt: { $gt: from } }] }).select('cohortId studentId startsAt endsAt').lean() : []
  const cohortIds = [...new Set(memberships.map((row) => id(row.cohortId)))]
  const scopes = []
  if (teacherIds.length) scopes.push({ teacherId: { $in: teacherIds } })
  if (studentIds.length) scopes.push({ studentId: { $in: studentIds } })
  if (cohortIds.length) scopes.push({ cohortId: { $in: cohortIds } })
  const assignments = scopes.length ? await Assignment.find({ team, $and: [{ $or: scopes }, { $or: [{ endsAt: null }, { endsAt: { $gt: from } }] }], startsAt: { $lt: to } }).select('team scopeType teacherId studentId cohortId supervisorId startsAt endsAt primary').lean() : []
  return { assignments, memberships }
}

async function ownerForSession(team, session) {
  const { assignments, memberships } = await loadCoverage(team, [session])
  return resolveOwner(session, assignments, memberships)
}

// Shared Mongo stages keep reports and lists aligned on the same dated owner.
function ownershipStages(team, at = '$scheduledAt') {
  return [
    { $lookup: { from: CohortMember.collection.name, let: { student: '$studentId', at }, pipeline: [
      { $match: { team, $expr: { $and: [{ $eq: ['$studentId', '$$student'] }, { $lte: ['$startsAt', '$$at'] }, { $or: [{ $eq: ['$endsAt', null] }, { $gt: ['$endsAt', '$$at'] }] }] } } },
      { $project: { cohortId: 1 } },
    ], as: 'activeMemberships' } },
    { $set: { activeCohortIds: '$activeMemberships.cohortId' } },
    { $lookup: { from: Assignment.collection.name, let: { teacher: '$teacherId', originalTeacher: '$supervisionOriginalTeacherId', student: '$studentId', cohorts: '$activeCohortIds', at }, pipeline: [
      { $match: { team, $expr: { $and: [
        { $lte: ['$startsAt', '$$at'] },
        { $or: [{ $eq: ['$endsAt', null] }, { $gt: ['$endsAt', '$$at'] }] },
        { $or: [
          { $and: [{ $eq: ['$scopeType', 'student'] }, { $eq: ['$studentId', '$$student'] }, { $in: ['$teacherId', ['$$teacher', '$$originalTeacher']] }] },
          { $and: [{ $eq: ['$scopeType', 'cohort'] }, { $in: ['$cohortId', '$$cohorts'] }] },
          { $and: [{ $eq: [{ $ifNull: ['$scopeType', 'teacher'] }, 'teacher'] }, { $in: ['$teacherId', ['$$teacher', '$$originalTeacher']] }] },
        ] },
      ] } } },
      { $set: { scopeRank: { $switch: { branches: [
        { case: { $eq: ['$scopeType', 'student'] }, then: 3 },
        { case: { $eq: ['$scopeType', 'cohort'] }, then: 2 },
      ], default: 1 } } } },
      { $sort: { scopeRank: -1, primary: -1, startsAt: -1, _id: 1 } },
      { $limit: 1 },
      { $project: { supervisorId: 1, scopeType: 1, primary: 1, startsAt: 1, endsAt: 1 } },
    ], as: 'effectiveOwner' } },
  ]
}

// Resolve ownership before pagination in MongoDB. Filtering a teacher's page
// after pagination would leak overridden students and produce incorrect totals.
async function listOwnedSessions({ team, from, to, userId, manager, admin, page, limit, sessionId, lateStart = false }) {
  const match = { scheduledAt: { $gte: from, $lt: to }, status: { $nin: ['cancelled', 'rescheduled'] } }
  if (lateStart) { match.status = { $in: ['scheduled', 'missed'] }; match.teacherStartedAt = null }
  if (sessionId) { match._id = sessionId; delete match.status }
  const pipeline = [{ $match: match }, ...ownershipStages(team)]
  if (!admin) pipeline.push({ $match: manager ? { 'effectiveOwner.0': { $exists: true } } : { 'effectiveOwner.0.supervisorId': userId } })
  pipeline.push({ $facet: {
    rows: [{ $sort: { scheduledAt: 1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1, teacherId: 1, supervisionOriginalTeacherId: 1, studentId: 1, titleAr: 1, scheduledAt: 1, durationMinutes: 1, status: 1, meetingLink: 1, teacherStartedAt: 1, studentLinkOpenedAt: 1, teacherLinkOpenedAt: 1, actualStartAt: 1, completedAt: 1, quranReportRequired: 1, isMakeup: 1, administrativeReadiness: 1, effectiveOwner: 1 } }],
    count: [{ $count: 'total' }],
  } })
  const [result] = await Session.aggregate(pipeline)
  return { rows: result?.rows || [], total: result?.count?.[0]?.total || 0 }
}

module.exports = { resolveOwner, loadCoverage, ownerForSession, ownershipStages, listOwnedSessions, id, activeAt }

const mongoose = require('mongoose')
const User = require('../models/User')
const Assignment = require('../models/SupervisionAssignment')
const CohortMember = require('../models/SupervisionCohortMember')
const Cohort = require('../models/SupervisionCohort')
const ScheduleRule = require('../models/ScheduleRule')
const Report = require('../models/AcademicObservationReport')
const Plan = require('../models/StudentAcademicPlan')
const { sendError, sendSuccess } = require('../utils/response')
const { loadCoverage, resolveOwner } = require('../services/supervisionCoverage.service')

const admin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.view')
const active = () => ({ startsAt: { $lte: new Date() }, $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] })
const person = 'firstNameAr lastNameAr email'

exports.teacher = async (req, res, next) => {
  try {
    if (!admin(req.user)) return sendError(res, 'غير مصرح', 403)
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'المعلم غير صالح', 400)
    if (!await User.exists({ _id: req.params.id, role: 'teacher' })) return sendError(res, 'المعلم غير موجود', 404)
    const [assignments, reports, studentIds] = await Promise.all([
      Assignment.find({ teacherId: req.params.id, $and: [{ $or: [{ scopeType: { $in: ['teacher', 'student'] } }, { scopeType: { $exists: false } }] }, { $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] }], startsAt: { $lte: new Date() } }).select('team scopeType studentId supervisorId startsAt endsAt').populate('studentId', person).populate('supervisorId', person).sort({ startsAt: -1 }).limit(100).lean(),
      Report.find({ teacherId: req.params.id }).select('sessionId studentId supervisorId scheduledAt status observation rating strengths improvements teacherPerformance teacherGuidance').populate('studentId', person).populate('supervisorId', person).sort({ scheduledAt: -1, _id: -1 }).limit(20).lean(),
      ScheduleRule.distinct('studentId', { teacherId: req.params.id, status: { $in: ['active', 'paused'] } }),
    ])
    const now = new Date()
    const sessions = studentIds.map((studentId) => ({ teacherId: req.params.id, studentId, scheduledAt: now }))
    const coverages = await Promise.all(['academic', 'administrative'].map((team) => loadCoverage(team, sessions)))
    const groupOwners = new Map()
    for (const [index, team] of ['academic', 'administrative'].entries()) {
      const { assignments: scopedAssignments, memberships } = coverages[index]
      for (const session of sessions) {
        const owner = resolveOwner(session, scopedAssignments, memberships)
        if (owner?.scopeType !== 'cohort') continue
        const key = `${team}:${owner.cohortId}:${owner.supervisorId}`
        const current = groupOwners.get(key) || { team, scopeType: 'cohort', cohortId: owner.cohortId,
          supervisorId: owner.supervisorId, startsAt: owner.startsAt, studentCount: 0 }
        current.studentCount += 1
        groupOwners.set(key, current)
      }
    }
    const groupRows = [...groupOwners.values()]
    const [groups, supervisors] = await Promise.all([
      Cohort.find({ _id: { $in: groupRows.map((row) => row.cohortId) } }).select('name').lean(),
      User.find({ _id: { $in: groupRows.map((row) => row.supervisorId) } }).select(person).lean(),
    ])
    const namesById = new Map(groups.map((row) => [String(row._id), row.name]))
    const supervisorsById = new Map(supervisors.map((row) => [String(row._id), row]))
    sendSuccess(res, { assignments: [...assignments, ...groupRows.map((row) => ({ ...row,
      cohortName: namesById.get(String(row.cohortId)) || 'مجموعة', supervisorId: supervisorsById.get(String(row.supervisorId)) }))], reports })
  } catch (error) { next(error) }
}

exports.student = async (req, res, next) => {
  try {
    if (!admin(req.user)) return sendError(res, 'غير مصرح', 403)
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'الطالب غير صالح', 400)
    if (!await User.exists({ _id: req.params.id, role: 'student' })) return sendError(res, 'الطالب غير موجود', 404)
    const [rules, memberships, reports, plans] = await Promise.all([
      ScheduleRule.find({ studentId: req.params.id, status: { $in: ['active', 'paused'] } }).select('teacherId').populate('teacherId', person).limit(50).lean(),
      CohortMember.find({ studentId: req.params.id, ...active() }).select('team cohortId startsAt').populate('cohortId', 'name team isActive').lean(),
      Report.find({ studentId: req.params.id }).select('sessionId teacherId supervisorId scheduledAt status observation rating studentLevel observations').populate('teacherId', person).populate('supervisorId', person).sort({ scheduledAt: -1, _id: -1 }).limit(20).lean(),
      Plan.find({ studentId: req.params.id }).select('subjectKey courseId status milestones updatedAt').populate('courseId', 'nameAr').sort({ updatedAt: -1 }).limit(50).lean(),
    ])
    const teachers = [...new Map(rules.filter((row) => row.teacherId).map((row) => [String(row.teacherId._id), row.teacherId])).values()]
    const now = new Date()
    const sessions = teachers.map((teacher) => ({ studentId: req.params.id, teacherId: teacher._id, scheduledAt: now }))
    const coverages = await Promise.all(['academic', 'administrative'].map((team) => loadCoverage(team, sessions)))
    const owners = teachers.flatMap((teacher) => coverages.map(({ assignments, memberships }, index) => {
      const team = ['academic', 'administrative'][index]
      const owner = resolveOwner({ studentId: req.params.id, teacherId: teacher._id, scheduledAt: now }, assignments, memberships)
      return owner ? { team, teacher, supervisorId: owner.supervisorId, scopeType: owner.scopeType || 'teacher', startsAt: owner.startsAt } : null
    }).filter(Boolean))
    const ids = [...new Set(owners.filter(Boolean).map((row) => String(row.supervisorId)))]
    const supervisors = await User.find({ _id: { $in: ids } }).select(person).lean()
    const byId = new Map(supervisors.map((row) => [String(row._id), row]))
    sendSuccess(res, { owners: owners.filter(Boolean).map((row) => ({ ...row, supervisorId: byId.get(String(row.supervisorId)) || null })), memberships, reports, plans })
  } catch (error) { next(error) }
}

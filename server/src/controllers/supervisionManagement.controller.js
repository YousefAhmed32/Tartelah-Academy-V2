const mongoose = require('mongoose')
const User = require('../models/User')
const Session = require('../models/Session')
const Shift = require('../models/SupervisionShift')
const Assignment = require('../models/SupervisionAssignment')
const CohortMember = require('../models/SupervisionCohortMember')
const coverageService = require('../services/supervisionCoverage.service')
const Settings = require('../models/SupervisionSettings')
const TeachingSubject = require('../models/TeachingSubject')
const AuditLog = require('../models/AuditLog')
const { SUPERVISION_TEAMS, SUPERVISION_PERMISSIONS } = require('../config/permissions')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { hasFutureWork } = require('../services/supervisionPersonnel.service')
const { notifySupervisionChange } = require('../services/supervisionNotification.service')

const isAdmin = (user) => user.isPrimaryAdmin || (user.role === 'admin' && user.hasPermission('supervision.view'))
const canManage = (user, team) => user.isPrimaryAdmin || (user.role === 'admin' && user.hasPermission('supervision.manage')) ||
  (user.supervisionTeam === team && user.supervisionPosition === 'manager' && user.hasPermission('supervision.manage'))
const validDate = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null
const identity = (value) => String(value?._id || value || '')

function teamFor(req, res) {
  const team = req.query.team || req.body?.team || req.user.supervisionTeam
  if (!SUPERVISION_TEAMS.includes(team) || (!isAdmin(req.user) && req.user.supervisionTeam !== team)) {
    sendError(res, 'لا يمكنك عرض هذا الفريق', 403)
    return null
  }
  return team
}

function pageFor(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

// One bounded page of real sessions; assignment and shift matches are loaded
// in batches, so this remains predictable as the academy grows.
exports.coverage = async (req, res, next) => {
  try {
    const team = teamFor(req, res)
    if (!team) return
    if (!canManage(req.user, team)) return sendError(res, 'غير مصرح', 403)
    const from = validDate(req.query.from)
    const to = validDate(req.query.to)
    if (!from || !to || to <= from || to - from > 7 * 86400000) return sendError(res, 'اختر فترة لا تتجاوز سبعة أيام', 400)
    const { page, limit, skip } = pageFor(req.query)
    const filter = { scheduledAt: { $gte: from, $lt: to }, status: { $nin: ['cancelled', 'rescheduled'] } }
    // A team manager sees only teachers belonging to that team's dated
    // supervision roster. The admin can audit academy-wide gaps, including
    // teachers who have no assignment in either team yet.
    if (!isAdmin(req.user)) {
      const roster = await Assignment.find({ team, startsAt: { $lt: to }, $or: [{ endsAt: null }, { endsAt: { $gt: from } }] }).select('scopeType teacherId studentId cohortId').lean()
      const teacherIds = roster.filter((row) => !row.scopeType || row.scopeType === 'teacher' || row.scopeType === 'student').map((row) => row.teacherId).filter(Boolean)
      const studentIds = roster.filter((row) => row.scopeType === 'student').map((row) => row.studentId).filter(Boolean)
      const cohortIds = roster.filter((row) => row.scopeType === 'cohort').map((row) => row.cohortId).filter(Boolean)
      if (cohortIds.length) studentIds.push(...await CohortMember.distinct('studentId', { team, cohortId: { $in: cohortIds }, startsAt: { $lt: to }, $or: [{ endsAt: null }, { endsAt: { $gt: from } }] }))
      filter.$or = [{ teacherId: { $in: teacherIds } }, { studentId: { $in: studentIds } }]
    }
    const [sessions, total] = await Promise.all([
      Session.find(filter).select('_id teacherId studentId scheduledAt status titleAr').sort({ scheduledAt: 1, _id: 1 }).skip(skip).limit(limit).populate('teacherId', 'firstNameAr lastNameAr').populate('studentId', 'firstNameAr lastNameAr').lean(),
      Session.countDocuments(filter),
    ])
    const { assignments, memberships } = await coverageService.loadCoverage(team, sessions)
    const supervisorIds = [...new Set(assignments.map((row) => identity(row.supervisorId)).filter(Boolean))]
    const [shifts, supervisorsById] = await Promise.all([
      supervisorIds.length ? Shift.find({ team, members: { $in: supervisorIds }, cancelledAt: null, startsAt: { $lt: to }, endsAt: { $gt: from } }).select('startsAt endsAt members').lean() : [],
      supervisorIds.length ? User.find({ _id: { $in: supervisorIds } }).select('firstNameAr lastNameAr isActive').lean() : [],
    ])
    const people = new Map(supervisorsById.map((person) => [identity(person), person]))
    const rows = sessions.map((session) => {
      const at = new Date(session.scheduledAt)
      const current = coverageService.resolveOwner(session, assignments, memberships)
      const supervisors = current && people.has(identity(current.supervisorId)) ? [{ ...people.get(identity(current.supervisorId)), primary: true, onShift: !!people.get(identity(current.supervisorId)).isActive && shifts.some((shift) => shift.startsAt <= at && shift.endsAt > at && shift.members.some((member) => identity(member) === identity(current.supervisorId))) }] : []
      const primary = supervisors.find((row) => row.primary) || supervisors[0]
      return { ...session, supervisor: primary || null, supervisors, coverage: !current ? 'unassigned' : supervisors.some((row) => row.onShift) ? 'covered' : supervisors.some((row) => row.isActive) ? 'off_shift' : 'inactive' }
    })
    sendPaginated(res, rows, total, page, limit)
  } catch (err) { next(err) }
}

exports.activity = async (req, res, next) => {
  try {
    const team = teamFor(req, res)
    if (!team) return
    if (!canManage(req.user, team)) return sendError(res, 'غير مصرح', 403)
    const { page, limit, skip } = pageFor(req.query)
    const actions = ['supervision_shift_create', 'supervision_shift_update', 'supervision_shift_cancel', 'supervision_assignment_create', 'supervision_assignment_replace', 'supervision_person_update', 'supervision_settings_update', 'create_admin', 'update_user', 'update_permissions', 'disable_user', 'reactivate_user']
    const filter = { action: { $in: actions }, $or: [{ 'changes.team': team }, { 'changes.teams': team }, { 'changes.supervisionTeam': team }] }
    const [rows, total] = await Promise.all([
      AuditLog.find(filter).select('actorId action entity entityId createdAt').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate('actorId', 'firstNameAr lastNameAr').lean(),
      AuditLog.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (err) { next(err) }
}

exports.getSettings = async (req, res, next) => {
  try {
    const team = teamFor(req, res)
    if (!team) return
    if (!canManage(req.user, team)) return sendError(res, 'غير مصرح', 403)
    const row = await Settings.findOne({ team }).lean()
    sendSuccess(res, row || { team, notificationRecipients: ['manager', 'supervisor'], reportGraceMinutes: 120, escalateAfterMinutes: 0, priorityCategories: [], effectiveAt: null })
  } catch (err) { next(err) }
}

exports.updateSettings = async (req, res, next) => {
  try {
    const team = teamFor(req, res)
    if (!team) return
    if (!isAdmin(req.user) || !req.user.hasPermission('supervision.manage')) return sendError(res, 'إعدادات الفريق يغيرها الأدمن فقط', 403)
    const { notificationRecipients, reportGraceMinutes, escalateAfterMinutes, priorityCategories } = req.body || {}
    const recipients = ['manager', 'supervisor', 'admin']
    if (!Array.isArray(notificationRecipients) || notificationRecipients.some((r) => !recipients.includes(r)) || new Set(notificationRecipients).size !== notificationRecipients.length ||
      !Number.isInteger(reportGraceMinutes) || reportGraceMinutes < 0 || reportGraceMinutes > 1440 || !Number.isInteger(escalateAfterMinutes) || escalateAfterMinutes < 0 || escalateAfterMinutes > 1440 ||
      !Array.isArray(priorityCategories) || priorityCategories.length > 50 || priorityCategories.some((key) => typeof key !== 'string' || key.length > 80) || new Set(priorityCategories).size !== priorityCategories.length) return sendError(res, 'إعدادات الإشراف غير صالحة', 400)
    if (priorityCategories.length && await TeachingSubject.countDocuments({ key: { $in: priorityCategories }, isActive: true }) !== priorityCategories.length) return sendError(res, 'توجد فئات غير نشطة أو غير معروفة', 400)
    const effectiveAt = new Date()
    const row = await Settings.findOneAndUpdate({ team }, { $set: { notificationRecipients, reportGraceMinutes, escalateAfterMinutes, priorityCategories, effectiveAt, updatedBy: req.user._id } }, { upsert: true, new: true, runValidators: true })
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_settings_update', entity: 'SupervisionSettings', entityId: row._id, changes: { team, notificationRecipients, reportGraceMinutes, escalateAfterMinutes, priorityCategories, effectiveAt }, ip: req.ip })
    await notifySupervisionChange({ team, actorId: req.user._id, eventId: `settings:${row._id}:${effectiveAt.getTime()}`, titleAr: 'تحديث سياسة الإشراف', bodyAr: 'تغيرت إعدادات الإشراف الخاصة بفريقك' })
    sendSuccess(res, row, 'تم حفظ إعدادات الفريق')
  } catch (err) { next(err) }
}

exports.updatePerson = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !isAdmin(req.user) || !req.user.hasPermission('admins.update') || !req.user.hasPermission('permissions.assign')) return sendError(res, 'غير مصرح', 403)
    const person = await User.findById(req.params.id).select('+tokenVersion')
    if (!person || !person.supervisionTeam || person.isPrimaryAdmin) return sendError(res, 'عضو الإشراف غير موجود', 404)
    const { team, position, isActive, categories = [] } = req.body || {}
    if (!SUPERVISION_TEAMS.includes(team) || !['manager', 'supervisor'].includes(position) || typeof isActive !== 'boolean') return sendError(res, 'بيانات العضو غير صالحة', 400)
    if (!Array.isArray(categories) || categories.length > 50 || categories.some((key) => typeof key !== 'string' || key.length > 80) || new Set(categories).size !== categories.length ||
      categories.length && await TeachingSubject.countDocuments({ key: { $in: categories }, isActive: true }) !== categories.length) return sendError(res, 'الفئات غير صالحة', 400)
    const identityChanged = team !== person.supervisionTeam || position !== person.supervisionPosition
    if ((identityChanged || !isActive) && await hasFutureWork(person._id)) {
      return sendError(res, 'انقل التكليفات وأزل العضو من الشيفتات القادمة قبل تغيير هويته أو إيقافه', 409)
    }
    const before = { team: person.supervisionTeam, position: person.supervisionPosition, isActive: person.isActive }
    person.supervisionTeam = team
    person.supervisionPosition = position
    person.role = position === 'manager' ? 'manager' : 'staff'
    person.permissions = SUPERVISION_PERMISSIONS[position]
    person.supervisionCategories = categories
    if (person.isActive !== isActive) {
      person.isActive = isActive
      person.disabledAt = isActive ? null : new Date()
      person.disabledBy = isActive ? null : req.user._id
      person.tokenVersion = (person.tokenVersion || 0) + 1
    } else if (identityChanged) person.tokenVersion = (person.tokenVersion || 0) + 1
    await person.save()
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_person_update', entity: 'User', entityId: person._id, changes: { team, teams: [before.team, team], before, after: { team, position, isActive, categories } }, ip: req.ip })
    await notifySupervisionChange({ team, actorId: req.user._id, supervisorId: position === 'supervisor' && isActive ? person._id : null, eventId: `person:${person._id}:${Date.now()}`, titleAr: 'تحديث فريق الإشراف', bodyAr: 'تغيرت بيانات عضو ضمن فريقك' })
    sendSuccess(res, { _id: person._id, supervisionTeam: team, supervisionPosition: position, supervisionCategories: categories, isActive }, 'تم تحديث عضو الإشراف')
  } catch (err) { next(err) }
}

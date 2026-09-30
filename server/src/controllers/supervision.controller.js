const mongoose = require('mongoose')
const crypto = require('crypto')
const User = require('../models/User')
const Shift = require('../models/SupervisionShift')
const ShiftRecord = require('../models/SupervisionShiftRecord')
const Assignment = require('../models/SupervisionAssignment')
const AssignmentLock = require('../models/SupervisionAssignmentLock')
const Cohort = require('../models/SupervisionCohort')
const CohortMember = require('../models/SupervisionCohortMember')
const ScheduleRule = require('../models/ScheduleRule')
const { SUPERVISION_TEAMS } = require('../config/permissions')
const { DEFAULT_ACADEMY_TIMEZONE, isValidTimezone } = require('../config/academyTimezone')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { notifySupervisionChange } = require('../services/supervisionNotification.service')

const id = (value) => mongoose.isValidObjectId(value)
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null
const teamValid = (value) => SUPERVISION_TEAMS.includes(value)
const pageArgs = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

function globalAccess(user) {
  return user.isPrimaryAdmin || (user.role === 'admin' && user.hasPermission('supervision.view'))
}
function canManage(user, team) {
  return (user.isPrimaryAdmin || (user.role === 'admin' && user.hasPermission('supervision.manage')) ||
    (user.supervisionTeam === team && user.supervisionPosition === 'manager' && user.hasPermission('supervision.manage')))
}
function allowedTeam(user, requested) {
  if (requested && !teamValid(requested)) return null
  return globalAccess(user) ? requested || null : user.supervisionTeam || null
}
function forbiddenTeam(user, team) {
  return !teamValid(team) || (!globalAccess(user) && user.supervisionTeam !== team)
}
function log(req, action, entity, entityId, changes) {
  return logAction({ actorId: req.user._id, actorRole: req.user.role, action, entity, entityId, changes, ip: req.ip })
}
function overlap(start, end) {
  return { startsAt: { $lt: end || new Date('9999-01-01') }, $or: [{ endsAt: null }, { endsAt: { $gt: start } }] }
}
async function withAssignmentLock(team, teacherId, work) {
  const key = `${team}:${teacherId}`
  const token = crypto.randomUUID()
  try {
    const now = new Date()
    const locked = await AssignmentLock.findOneAndUpdate(
      { _id: key, $or: [{ expiresAt: { $lte: now } }, { token }] },
      { $set: { token, expiresAt: new Date(now.getTime() + 60000) } },
      { upsert: true, new: true }
    )
    if (locked.token !== token) return { busy: true }
  } catch (err) {
    if (err.code === 11000) return { busy: true }
    throw err
  }
  try { return await work() } finally { await AssignmentLock.deleteOne({ _id: key, token }) }
}

exports.listPeople = async (req, res, next) => {
  try {
    const team = allowedTeam(req.user, req.query.team)
    if (!team && !globalAccess(req.user)) return sendError(res, 'لا يمكنك عرض هذا الفريق', 403)
    if (req.query.team && forbiddenTeam(req.user, req.query.team)) return sendError(res, 'لا يمكنك عرض هذا الفريق', 403)
    const { page, limit, skip } = pageArgs(req.query)
    const filter = { supervisionTeam: team || { $in: SUPERVISION_TEAMS } }
    const search = String(req.query.search || '').trim().slice(0, 80)
    if (search) filter.$or = ['firstNameAr', 'lastNameAr', 'email'].map((field) => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }))
    if (req.query.position === 'manager' || req.query.position === 'supervisor') filter.supervisionPosition = req.query.position
    if (req.query.active === 'true') filter.isActive = true
    const [rows, total] = await Promise.all([
      User.find(filter).select('firstNameAr lastNameAr email role isActive supervisionTeam supervisionPosition supervisionCategories displayRoleName').sort({ firstNameAr: 1, _id: 1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (err) { next(err) }
}

exports.listTeachers = async (req, res, next) => {
  try {
    if (req.user.supervisionPosition === 'supervisor' && !globalAccess(req.user)) return sendError(res, 'غير مصرح', 403)
    const { page, limit, skip } = pageArgs(req.query)
    const search = String(req.query.search || '').trim().slice(0, 80)
    const filter = { role: 'teacher', isActive: true }
    if (search) filter.$or = ['firstNameAr', 'lastNameAr', 'email'].map((field) => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }))
    const [rows, total] = await Promise.all([
      User.find(filter).select('firstNameAr lastNameAr email').sort({ firstNameAr: 1, _id: 1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (err) { next(err) }
}

exports.listStudents = async (req, res, next) => {
  try {
    const team = allowedTeam(req.user, req.query.team)
    if (!team || !canManage(req.user, team)) return sendError(res, 'غير مصرح', 403)
    const { page, limit, skip } = pageArgs(req.query)
    const search = String(req.query.search || '').trim().slice(0, 80)
    const filter = { role: 'student', isActive: true }
    if (search) filter.$or = ['firstNameAr', 'lastNameAr', 'email'].map((field) => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }))
    const [rows, total] = await Promise.all([
      User.find(filter).select('firstNameAr lastNameAr email').sort({ firstNameAr: 1, _id: 1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (err) { next(err) }
}

exports.listShifts = async (req, res, next) => {
  try {
    if (req.query.team && forbiddenTeam(req.user, req.query.team)) return sendError(res, 'لا يمكنك عرض هذا الفريق', 403)
    const team = allowedTeam(req.user, req.query.team)
    if (!team && !globalAccess(req.user)) return sendError(res, 'غير مصرح', 403)
    const { page, limit, skip } = pageArgs(req.query)
    const filter = req.query.history === 'true' ? {} : { cancelledAt: null, endsAt: { $gt: new Date() } }
    if (team) filter.team = team
    if (!globalAccess(req.user) && req.user.supervisionPosition === 'supervisor') filter.members = req.user._id
    const from = date(req.query.from)
    const to = date(req.query.to)
    if (req.query.from && !from || req.query.to && !to) return sendError(res, 'نطاق التاريخ غير صالح', 400)
    if (from) filter.endsAt = { $gt: from }
    if (to) filter.startsAt = { $lt: to }
    const [rows, total] = await Promise.all([
      Shift.find(filter).sort(req.query.history === 'true' ? { startsAt: -1, _id: -1 } : { startsAt: 1, _id: 1 }).skip(skip).limit(limit).populate('members', 'firstNameAr lastNameAr supervisionTeam supervisionPosition isActive').lean(),
      Shift.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (err) { next(err) }
}

async function validMembers(members, team) {
  if (!Array.isArray(members) || members.length < 1 || members.length > 50 || members.some((x) => !id(x))) return false
  const unique = [...new Set(members.map(String))]
  if (unique.length !== members.length) return false
  return await User.countDocuments({ _id: { $in: unique }, supervisionTeam: team, supervisionPosition: { $in: ['manager', 'supervisor'] }, isActive: true }) === unique.length
}

exports.createShift = async (req, res, next) => {
  try {
    const { team, name, startsAt, endsAt, timezone = DEFAULT_ACADEMY_TIMEZONE, members } = req.body || {}
    if (!canManage(req.user, team)) return sendError(res, 'لا يمكنك إدارة شيفت هذا الفريق', 403)
    const start = date(startsAt); const end = date(endsAt)
    if (!start || !end || end <= start || end - start > 48 * 3600000 || !isValidTimezone(timezone) || !String(name || '').trim() || String(name).length > 100) {
      return sendError(res, 'بيانات الشيفت أو مدته غير صالحة', 400)
    }
    if (!await validMembers(members, team)) return sendError(res, 'أعضاء الشيفت يجب أن يكونوا نشطين ومن نفس الفريق', 400)
    const row = await Shift.create({ team, name: String(name).trim(), startsAt: start, endsAt: end, timezone, members, createdBy: req.user._id })
    await log(req, 'supervision_shift_create', 'SupervisionShift', row._id, { team, startsAt: start, endsAt: end, members })
    await notifySupervisionChange({ team, actorId: req.user._id, supervisorIds: members, eventId: `shift-create:${row._id}`, titleAr: 'شيفت إشراف جديد', bodyAr: `أُضيف شيفت ${row.name}` })
    sendSuccess(res, row, 'تم إنشاء الشيفت', 201)
  } catch (err) { next(err) }
}

exports.updateShift = async (req, res, next) => {
  try {
    if (!id(req.params.id)) return sendError(res, 'الشيفت غير صالح', 400)
    const row = await Shift.findById(req.params.id)
    if (!row || row.cancelledAt) return sendError(res, 'الشيفت غير موجود', 404)
    if (!canManage(req.user, row.team)) return sendError(res, 'غير مصرح', 403)
    if (!req.body || row.endsAt <= new Date()) return sendError(res, 'لا يمكن تعديل شيفت منتهٍ؛ سجل التصحيح بشكل مستقل', 409)
    const start = req.body.startsAt === undefined ? row.startsAt : date(req.body.startsAt)
    const end = req.body.endsAt === undefined ? row.endsAt : date(req.body.endsAt)
    const timezone = req.body.timezone === undefined ? row.timezone : req.body.timezone
    const members = req.body.members === undefined ? row.members : req.body.members
    const name = req.body.name === undefined ? row.name : String(req.body.name).trim()
    if (!start || !end || end <= start || end - start > 48 * 3600000 || !isValidTimezone(timezone) || !name || name.length > 100 || !await validMembers(members, row.team)) {
      return sendError(res, 'بيانات الشيفت غير صالحة', 400)
    }
    if ((start.getTime() !== row.startsAt.getTime() || end.getTime() !== row.endsAt.getTime() || members.map(String).sort().join() !== row.members.map(String).sort().join()) &&
      await ShiftRecord.exists({ shiftId: row._id })) return sendError(res, 'بدأ توثيق هذا الشيفت؛ لا يمكن تغيير موعده أو أعضاءه بعد تسجيل الحضور أو التسليم', 409)
    const before = { startsAt: row.startsAt, endsAt: row.endsAt, members: row.members }
    Object.assign(row, { startsAt: start, endsAt: end, timezone, members, name, updatedBy: req.user._id })
    await row.save()
    await log(req, 'supervision_shift_update', 'SupervisionShift', row._id, { team: row.team, before, after: { startsAt: start, endsAt: end, members } })
    await notifySupervisionChange({ team: row.team, actorId: req.user._id, supervisorIds: [...before.members, ...members], eventId: `shift-update:${row._id}:${row.updatedAt?.getTime() || Date.now()}`, titleAr: 'تغيير في شيفت الإشراف', bodyAr: `تغير شيفت ${row.name}` })
    sendSuccess(res, row, 'تم تحديث الشيفت')
  } catch (err) { next(err) }
}

exports.cancelShift = async (req, res, next) => {
  try {
    if (!id(req.params.id)) return sendError(res, 'الشيفت غير صالح', 400)
    const row = await Shift.findById(req.params.id)
    if (!row || row.cancelledAt) return sendError(res, 'الشيفت غير موجود', 404)
    if (!canManage(req.user, row.team)) return sendError(res, 'غير مصرح', 403)
    if (row.endsAt <= new Date() || await ShiftRecord.exists({ shiftId: row._id })) return sendError(res, 'لا يمكن إلغاء شيفت انتهى أو بدأ توثيقه', 409)
    row.cancelledAt = new Date(); row.cancelledBy = req.user._id
    await row.save()
    await log(req, 'supervision_shift_cancel', 'SupervisionShift', row._id, { team: row.team })
    await notifySupervisionChange({ team: row.team, actorId: req.user._id, supervisorIds: row.members, eventId: `shift-cancel:${row._id}`, titleAr: 'إلغاء شيفت إشراف', bodyAr: `أُلغي شيفت ${row.name}` })
    sendSuccess(res, row, 'تم إلغاء الشيفت مع حفظ سجله')
  } catch (err) { next(err) }
}

exports.listAssignments = async (req, res, next) => {
  try {
    if (req.query.team && forbiddenTeam(req.user, req.query.team)) return sendError(res, 'لا يمكنك عرض هذا الفريق', 403)
    const team = allowedTeam(req.user, req.query.team)
    if (!team && !globalAccess(req.user)) return sendError(res, 'غير مصرح', 403)
    const { page, limit, skip } = pageArgs(req.query)
    const filter = {}
    if (team) filter.team = team
    if (!globalAccess(req.user) && req.user.supervisionPosition === 'supervisor') filter.supervisorId = req.user._id
    if (req.query.teacherId) {
      if (!id(req.query.teacherId)) return sendError(res, 'المعلم غير صالح', 400)
      filter.teacherId = req.query.teacherId
    }
    if (req.query.cohortId) {
      if (!id(req.query.cohortId)) return sendError(res, 'المجموعة غير صالحة', 400)
      filter.cohortId = req.query.cohortId
    }
    const at = req.query.at === undefined ? new Date() : date(req.query.at)
    if (!at) return sendError(res, 'التاريخ غير صالح', 400)
    if (req.query.history !== 'true') Object.assign(filter, { startsAt: { $lte: at }, $or: [{ endsAt: null }, { endsAt: { $gt: at } }] })
    const [rows, total] = await Promise.all([
      Assignment.find(filter).sort({ startsAt: -1, _id: -1 }).skip(skip).limit(limit).populate('teacherId', 'firstNameAr lastNameAr email').populate('studentId', 'firstNameAr lastName email').populate('cohortId', 'name team isActive').populate('supervisorId', 'firstNameAr lastNameAr supervisionTeam supervisionPosition isActive').lean(),
      Assignment.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (err) { next(err) }
}

exports.createAssignment = async (req, res, next) => {
  try {
    const { team, teacherId, studentId, cohortId, scopeType = 'teacher', supervisorId, startsAt, endsAt, primary = true, reason } = req.body || {}
    if (!teamValid(team)) return sendError(res, 'فريق الإشراف غير صالح', 400)
    if (!canManage(req.user, team)) return sendError(res, 'لا يمكنك إدارة تكليف هذا الفريق', 403)
    const start = date(startsAt); const end = endsAt ? date(endsAt) : null
    const validScope = scopeType === 'teacher' ? id(teacherId) && !studentId && !cohortId
      : scopeType === 'student' ? id(teacherId) && id(studentId) && !cohortId
        : scopeType === 'cohort' ? id(cohortId) && !teacherId && !studentId : false
    if (!validScope || !id(supervisorId) || !start || endsAt && !end || end && end <= start || typeof primary !== 'boolean' || String(reason || '').length > 500) {
      return sendError(res, 'بيانات التكليف غير صالحة', 400)
    }
    const [teacher, student, cohort, supervisor] = await Promise.all([
      teacherId ? User.findById(teacherId).select('role isActive') : null,
      studentId ? User.findById(studentId).select('role isActive') : null,
      cohortId ? Cohort.findById(cohortId).select('team isActive') : null,
      User.findById(supervisorId).select('supervisionTeam supervisionPosition isActive'),
    ])
    if (teacherId && (teacher?.role !== 'teacher' || !teacher.isActive) || studentId && (student?.role !== 'student' || !student.isActive) || cohortId && (cohort?.team !== team || !cohort.isActive) || supervisor?.supervisionTeam !== team || supervisor?.supervisionPosition !== 'supervisor' || !supervisor?.isActive) {
      return sendError(res, 'المعلم أو الطالب أو المجموعة أو المشرف غير نشط أو خارج الفريق', 400)
    }
    if (scopeType === 'student') {
      const paired = await ScheduleRule.exists({ teacherId, studentId, status: { $in: ['active', 'paused'] } })
      if (!paired) return sendError(res, 'الطالب غير مرتبط بهذا المعلم في جدول نشط', 400)
    }
    const scopeFilter = scopeType === 'teacher' ? { teacherId, scopeType: { $in: ['teacher', null] } }
      : scopeType === 'student' ? { teacherId, studentId, scopeType } : { cohortId, scopeType }
    const result = await withAssignmentLock(team, `${scopeType}:${teacherId || cohortId}:${studentId || ''}`, async () => {
      const conflict = primary && await Assignment.exists({ team, ...scopeFilter, primary: true, ...overlap(start, end) })
      // Secondary assignments may coexist with the primary, but an owner
      // cannot receive two overlapping records for the same teacher.
      if (conflict || await Assignment.exists({ team, ...scopeFilter, supervisorId, ...overlap(start, end) })) return { conflict: true }
      return { row: await Assignment.create({ team, scopeType, teacherId, studentId, cohortId, supervisorId, startsAt: start, endsAt: end, primary, reason, createdBy: req.user._id }) }
    })
    if (result.busy || result.conflict) return sendError(res, 'يوجد تكليف متعارض أو تغيير جارٍ لنفس المعلم', 409)
    await log(req, 'supervision_assignment_create', 'SupervisionAssignment', result.row._id, { team, scopeType, teacherId, studentId, cohortId, supervisorId, startsAt: start, endsAt: end, primary })
    await notifySupervisionChange({ team, actorId: req.user._id, supervisorId, eventId: `assignment-create:${result.row._id}`, titleAr: 'تكليف إشراف جديد', bodyAr: 'أُضيف تكليف لمتابعة معلم ضمن فريقك' })
    sendSuccess(res, result.row, 'تم إنشاء التكليف', 201)
  } catch (err) { next(err) }
}

exports.replaceAssignment = async (req, res, next) => {
  try {
    if (!id(req.params.id) || !id(req.body?.supervisorId)) return sendError(res, 'بيانات التبديل غير صالحة', 400)
    const old = await Assignment.findById(req.params.id)
    if (!old) return sendError(res, 'التكليف غير موجود', 404)
    if (!canManage(req.user, old.team)) return sendError(res, 'غير مصرح', 403)
    const at = date(req.body.effectiveAt)
    if (!at || at < old.startsAt || at.getTime() < Date.now() - 60000 || old.endsAt && at >= old.endsAt || String(req.body.reason || '').length > 500) return sendError(res, 'تاريخ التبديل أو سببه غير صالح', 400)
    const replacement = await User.findById(req.body.supervisorId).select('supervisionTeam supervisionPosition isActive')
    if (replacement?.supervisionTeam !== old.team || replacement.supervisionPosition !== 'supervisor' || !replacement.isActive || String(old.supervisorId) === String(replacement._id)) return sendError(res, 'المشرف البديل غير صالح', 400)
    const scopeType = old.scopeType || 'teacher'
    const scopeFilter = scopeType === 'teacher' ? { teacherId: old.teacherId, scopeType: { $in: ['teacher', null] } }
      : scopeType === 'student' ? { teacherId: old.teacherId, studentId: old.studentId, scopeType } : { cohortId: old.cohortId, scopeType }
    const result = await withAssignmentLock(old.team, `${scopeType}:${old.teacherId || old.cohortId}:${old.studentId || ''}`, async () => {
      const current = await Assignment.findById(old._id)
      if (!current || current.replacedBy || current.endsAt && at >= current.endsAt) return { conflict: true }
      if (await Assignment.exists({ team: current.team, ...scopeFilter, supervisorId: replacement._id, ...overlap(at, current.endsAt) })) return { conflict: true }
      const oldEnd = current.endsAt
      current.endsAt = at; current.closedBy = req.user._id
      await current.save()
      let nextAssignment
      try {
        nextAssignment = await Assignment.create({ team: current.team, scopeType, teacherId: current.teacherId, studentId: current.studentId, cohortId: current.cohortId, supervisorId: replacement._id, startsAt: at, endsAt: oldEnd, primary: current.primary, reason: req.body.reason, createdBy: req.user._id })
        current.replacedBy = nextAssignment._id
        await current.save()
      } catch (err) {
        // If the final link save fails after the new interval was inserted,
        // remove only that just-created interval before reopening the old one.
        // Otherwise two primary owners could overlap after an API error.
        if (nextAssignment) await Assignment.deleteOne({ _id: nextAssignment._id })
        current.endsAt = oldEnd; current.closedBy = null
        current.replacedBy = null
        await current.save()
        throw err
      }
      return { row: nextAssignment, oldId: current._id }
    })
    if (result.busy || result.conflict) return sendError(res, 'التكليف تغيّر بالفعل أو يوجد تعارض', 409)
    await log(req, 'supervision_assignment_replace', 'SupervisionAssignment', result.row._id, { team: old.team, replaced: result.oldId, supervisorId: replacement._id, effectiveAt: at })
    await notifySupervisionChange({ team: old.team, actorId: req.user._id, supervisorId: replacement._id, eventId: `assignment-replace:${result.row._id}`, titleAr: 'تبديل مشرف', bodyAr: 'تغيّر المشرف المسؤول عن معلم ضمن فريقك' })
    sendSuccess(res, result.row, 'تم تبديل المشرف مع حفظ سجل التكليف السابق', 201)
  } catch (err) { next(err) }
}

exports.assignmentStudents = async (req, res, next) => {
  try {
    if (!id(req.params.id)) return sendError(res, 'التكليف غير صالح', 400)
    const row = await Assignment.findById(req.params.id)
    if (!row) return sendError(res, 'التكليف غير موجود', 404)
    if (forbiddenTeam(req.user, row.team) || (!globalAccess(req.user) && req.user.supervisionPosition === 'supervisor' && String(row.supervisorId) !== String(req.user._id))) return sendError(res, 'غير مصرح', 403)
    const { page, limit, skip } = pageArgs(req.query)
    let ids
    if (row.scopeType === 'student') ids = [row.studentId]
    else if (row.scopeType === 'cohort') {
      ids = await CohortMember.distinct('studentId', { cohortId: row.cohortId, startsAt: { $lt: row.endsAt || new Date('9999-01-01') }, $or: [{ endsAt: null }, { endsAt: { $gt: row.startsAt } }] })
    } else {
      const filter = { teacherId: row.teacherId, status: { $in: ['active', 'paused'] }, startDate: { $lt: row.endsAt || new Date('9999-01-01') }, $or: [{ endDate: null }, { endDate: { $gt: row.startsAt } }] }
      ids = await ScheduleRule.distinct('studentId', filter)
    }
    const [students, total] = await Promise.all([User.find({ _id: { $in: ids }, role: 'student' }).select('firstNameAr lastNameAr').sort({ firstNameAr: 1, _id: 1 }).skip(skip).limit(limit).lean(), User.countDocuments({ _id: { $in: ids }, role: 'student' })])
    sendPaginated(res, students, total, page, limit)
  } catch (err) { next(err) }
}

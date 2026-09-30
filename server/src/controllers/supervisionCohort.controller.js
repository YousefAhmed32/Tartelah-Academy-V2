const mongoose = require('mongoose')
const Cohort = require('../models/SupervisionCohort')
const Member = require('../models/SupervisionCohortMember')
const Assignment = require('../models/SupervisionAssignment')
const User = require('../models/User')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { logAction } = require('../services/audit.service')

const validId = mongoose.isValidObjectId
const admin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.view')
const canView = (user, team) => admin(user) || user.supervisionTeam === team
const limitedViewer = (user) => !admin(user) && user.supervisionPosition !== 'manager'
const canManage = (user, team) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.manage') || user.supervisionTeam === team && user.supervisionPosition === 'manager' && user.hasPermission('supervision.manage')
const pageArgs = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20)) })
const cleanText = (value, max) => typeof value === 'string' && value.trim().length && value.trim().length <= max ? value.trim() : null
const log = (req, action, id, changes) => logAction({ actorId: req.user._id, actorRole: req.user.role, action, entity: 'SupervisionCohort', entityId: id, changes, ip: req.ip })

async function activeStudents(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length > 100 || studentIds.some((id) => !validId(id))) return null
  const unique = [...new Set(studentIds.map(String))]
  if (!unique.length) return []
  const count = await User.countDocuments({ _id: { $in: unique }, role: 'student', isActive: true })
  return count === unique.length ? unique : null
}

exports.list = async (req, res, next) => {
  try {
    const team = req.query.team || req.user.supervisionTeam
    if (!['academic', 'administrative'].includes(team) || !canView(req.user, team)) return sendError(res, 'غير مصرح', 403)
    const { page, limit } = pageArgs(req.query)
    const filter = { team, ...(req.query.active === 'true' ? { isActive: true } : {}) }
    if (limitedViewer(req.user)) {
      const now = new Date()
      filter._id = { $in: await Assignment.distinct('cohortId', { team, scopeType: 'cohort', supervisorId: req.user._id,
        startsAt: { $lte: now }, $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }) }
    }
    const [rows, total] = await Promise.all([
      Cohort.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Cohort.countDocuments(filter),
    ])
    const ids = rows.map((row) => row._id)
    const [counts, assignments] = await Promise.all([
      Member.aggregate([{ $match: { cohortId: { $in: ids }, endsAt: null } }, { $group: { _id: '$cohortId', count: { $sum: 1 } } }]),
      Assignment.find({ team, scopeType: 'cohort', cohortId: { $in: ids }, startsAt: { $lte: new Date() }, $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] }).select('cohortId supervisorId startsAt endsAt').populate('supervisorId', 'firstNameAr lastNameAr').lean(),
    ])
    const byId = new Map(counts.map((row) => [String(row._id), row.count]))
    sendPaginated(res, rows.map((row) => ({ ...row, memberCount: byId.get(String(row._id)) || 0, assignment: assignments.find((item) => String(item.cohortId) === String(row._id)) || null })), total, page, limit)
  } catch (error) { next(error) }
}

exports.detail = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return sendError(res, 'المجموعة غير صالحة', 400)
    const row = await Cohort.findById(req.params.id).lean()
    if (!row) return sendError(res, 'المجموعة غير موجودة', 404)
    if (!canView(req.user, row.team)) return sendError(res, 'غير مصرح', 403)
    if (limitedViewer(req.user) && !await Assignment.exists({ team: row.team, scopeType: 'cohort', cohortId: row._id,
      supervisorId: req.user._id, startsAt: { $lte: new Date() }, $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] })) return sendError(res, 'المجموعة خارج تكليفك', 403)
    const { page, limit } = pageArgs(req.query)
    const filter = { cohortId: row._id, ...(req.query.history === 'true' ? {} : { endsAt: null }) }
    const [members, total] = await Promise.all([
      Member.find(filter).sort({ startsAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('studentId', 'firstNameAr lastNameAr').lean(),
      Member.countDocuments(filter),
    ])
    res.json({ success: true, data: { ...row, members, total, page, limit } })
  } catch (error) { next(error) }
}

exports.create = async (req, res, next) => {
  try {
    const { team, name, notes = '', studentIds = [] } = req.body || {}
    if (!['academic', 'administrative'].includes(team) || !canManage(req.user, team)) return sendError(res, 'غير مصرح', 403)
    const cleanName = cleanText(name, 100)
    const students = await activeStudents(studentIds)
    if (!cleanName || notes && !cleanText(notes, 500) || !students) return sendError(res, 'بيانات المجموعة غير صالحة', 400)
    const existing = students.length ? await Member.exists({ team, studentId: { $in: students }, endsAt: null }) : null
    if (existing) return sendError(res, 'أحد الطلاب موجود في مجموعة نشطة لهذا الفريق', 409)
    const row = await Cohort.create({ team, name: cleanName, notes, createdBy: req.user._id })
    try {
      if (students.length) await Member.insertMany(students.map((studentId) => ({ team, cohortId: row._id, studentId, startsAt: new Date(), endsAt: null, createdBy: req.user._id })), { ordered: true })
    } catch (error) {
      await Member.deleteMany({ cohortId: row._id })
      await Cohort.deleteOne({ _id: row._id })
      if (error.code === 11000) return sendError(res, 'أحد الطلاب أُضيف لمجموعة أخرى أثناء الحفظ', 409)
      throw error
    }
    await log(req, 'supervision_cohort_create', row._id, { team, students: students.length })
    sendSuccess(res, row, 'تم إنشاء المجموعة', 201)
  } catch (error) { next(error) }
}

exports.update = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return sendError(res, 'المجموعة غير صالحة', 400)
    const row = await Cohort.findById(req.params.id)
    if (!row) return sendError(res, 'المجموعة غير موجودة', 404)
    if (!canManage(req.user, row.team)) return sendError(res, 'غير مصرح', 403)
    const patch = {}
    if (req.body.name !== undefined) { patch.name = cleanText(req.body.name, 100); if (!patch.name) return sendError(res, 'اسم المجموعة غير صالح', 400) }
    if (req.body.notes !== undefined) { if (typeof req.body.notes !== 'string' || req.body.notes.length > 500) return sendError(res, 'الملاحظات غير صالحة', 400); patch.notes = req.body.notes.trim() }
    if (req.body.isActive !== undefined) { if (typeof req.body.isActive !== 'boolean') return sendError(res, 'حالة المجموعة غير صالحة', 400); patch.isActive = req.body.isActive }
    Object.assign(row, patch)
    await row.save()
    if (patch.isActive === false) {
      const at = new Date()
      await Member.updateMany({ cohortId: row._id, $or: [{ endsAt: null }, { endsAt: { $gt: at } }] }, { $set: { endsAt: at, closedBy: req.user._id } })
      await Assignment.updateMany({ cohortId: row._id, scopeType: 'cohort', startsAt: { $lte: at }, $or: [{ endsAt: null }, { endsAt: { $gt: at } }] }, { $set: { endsAt: at, closedBy: req.user._id } })
      await Assignment.updateMany({ cohortId: row._id, scopeType: 'cohort', startsAt: { $gt: at } }, [{ $set: { endsAt: '$startsAt', closedBy: req.user._id } }])
    }
    await log(req, 'supervision_cohort_update', row._id, { team: row.team, ...patch })
    sendSuccess(res, row, 'تم تحديث المجموعة')
  } catch (error) { next(error) }
}

exports.addMembers = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return sendError(res, 'المجموعة غير صالحة', 400)
    const row = await Cohort.findById(req.params.id)
    if (!row || !row.isActive) return sendError(res, 'المجموعة غير نشطة', 404)
    if (!canManage(req.user, row.team)) return sendError(res, 'غير مصرح', 403)
    const students = await activeStudents(req.body?.studentIds)
    if (!students?.length) return sendError(res, 'اختر طلابًا نشطين', 400)
    if (await Member.exists({ team: row.team, studentId: { $in: students }, endsAt: null })) return sendError(res, 'أحد الطلاب موجود في مجموعة نشطة لهذا الفريق', 409)
    const at = new Date()
    try {
      await Member.insertMany(students.map((studentId) => ({ team: row.team, cohortId: row._id, studentId, startsAt: at, endsAt: null, createdBy: req.user._id })), { ordered: true })
    } catch (error) {
      await Member.updateMany({ cohortId: row._id, studentId: { $in: students }, startsAt: at, endsAt: null }, { $set: { endsAt: new Date(), closedBy: req.user._id } })
      if (error.code === 11000) return sendError(res, 'أحد الطلاب أُضيف لمجموعة أخرى أثناء الحفظ', 409)
      throw error
    }
    await log(req, 'supervision_cohort_members_add', row._id, { team: row.team, studentIds: students })
    sendSuccess(res, { added: students.length }, 'أُضيف الطلاب للمجموعة')
  } catch (error) { next(error) }
}

exports.removeMember = async (req, res, next) => {
  try {
    if (!validId(req.params.id) || !validId(req.params.studentId)) return sendError(res, 'بيانات الطالب غير صالحة', 400)
    const row = await Cohort.findById(req.params.id)
    if (!row) return sendError(res, 'المجموعة غير موجودة', 404)
    if (!canManage(req.user, row.team)) return sendError(res, 'غير مصرح', 403)
    const member = await Member.findOneAndUpdate({ cohortId: row._id, studentId: req.params.studentId, endsAt: null }, { $set: { endsAt: new Date(), closedBy: req.user._id } }, { new: true })
    if (!member) return sendError(res, 'الطالب غير موجود في المجموعة', 404)
    await log(req, 'supervision_cohort_member_remove', row._id, { team: row.team, studentId: req.params.studentId })
    sendSuccess(res, member, 'أُزيل الطالب مع حفظ تاريخ عضويته')
  } catch (error) { next(error) }
}

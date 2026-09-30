const mongoose = require('mongoose')
const Report = require('../models/AcademicPeriodicReport')
const User = require('../models/User')
const Session = require('../models/Session')
const ScheduleRule = require('../models/ScheduleRule')
const Observation = require('../models/AcademicObservationReport')
const Recognition = require('../models/AcademicRecognition')
const { metrics, periodBounds } = require('../services/academicPeriodic.service')
const { ownershipStages } = require('../services/supervisionCoverage.service')
const { sendError, sendSuccess, sendPaginated } = require('../utils/response')
const { logAction } = require('../services/audit.service')

const id = (value) => String(value?._id || value || '')
const oid = (value) => mongoose.isValidObjectId(value)
const admin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission?.('supervision.view')
const manager = (user) => user.supervisionTeam === 'academic' && user.supervisionPosition === 'manager' && user.hasPermission?.('supervision.view')
const supervisor = (user) => user.supervisionTeam === 'academic' && user.supervisionPosition === 'supervisor' && user.hasPermission?.('supervision.view')
const leader = (user) => admin(user) || manager(user)
const pageArgs = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(30, Math.max(1, Number.parseInt(query.limit, 10) || 20)) })
const nominations = ['distinguishedTeachers', 'teachersNeedingSupport', 'distinguishedStudents', 'studentsNeedingSupport']
const narrative = ['achievements', 'challenges', 'actions', 'recommendations', 'generalNotes', 'strength', 'improvement', 'nextGoal']
const ratings = ['excellent', 'very_good', 'good', 'needs_improvement']

const audit = (req, action, row, changes) => logAction({ actorId: req.user._id, actorRole: req.user.role,
  action, entity: 'AcademicPeriodicReport', entityId: row._id, changes, ip: req.ip })
function scopeUser(user) { return leader(user) || supervisor(user) }
function canRead(user, row) { return leader(user) || supervisor(user) && id(row.supervisorId) === id(user) }
function reportType(value) { return ['R3', 'R4'].includes(value) ? value : null }
function text(value, limit) { return typeof value === 'string' && value.trim().length <= limit ? value.trim() : null }
function validPeriod(query) {
  const type = query.type === 'R3' ? 'week' : query.type === 'R4' ? 'month' : 'day'
  return periodBounds(query.start, type)
}
async function validateAnalysis(value, supervisorId, from, to) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('التحليل غير صالح')
  const result = {}
  for (const key of narrative) {
    if (value[key] !== undefined) {
      const cleaned = text(value[key], ['strength', 'improvement', 'nextGoal'].includes(key) ? 2000 : 4000)
      if (cleaned === null) throw new Error('النص أطول من المسموح')
      result[key] = cleaned
    }
  }
  if (value.rating !== undefined) {
    if (value.rating && !ratings.includes(value.rating)) throw new Error('التقييم الوصفي غير صالح')
    result.rating = value.rating || undefined
  }
  for (const key of nominations) {
    if (value[key] === undefined) continue
    if (!Array.isArray(value[key]) || value[key].length > (key === 'distinguishedStudents' ? 10 : 20)) throw new Error('عدد الترشيحات غير صالح')
    const rows = []
    const seen = new Set()
    for (const row of value[key]) {
      if (!oid(row.personId) || !text(row.reason, 1000) || text(row.evidence || '', 1000) === null || seen.has(id(row.personId))) throw new Error('بيانات الترشيح غير صالحة')
      seen.add(id(row.personId))
      const isStudent = key.includes('Students')
      const person = await User.findOne({ _id: row.personId, role: isStudent ? 'student' : 'teacher' }).select('_id').lean()
      if (!person) throw new Error('المرشح غير موجود')
      const scoped = await Session.aggregate([
        { $match: { [isStudent ? 'studentId' : 'teacherId']: new mongoose.Types.ObjectId(row.personId),
          scheduledAt: { $gte: from, $lt: to } } },
        ...ownershipStages('academic'),
        { $match: supervisorId ? { 'effectiveOwner.0.supervisorId': new mongoose.Types.ObjectId(supervisorId) }
          : { 'effectiveOwner.0': { $exists: true } } },
        { $limit: 1 }, { $project: { _id: 1 } },
      ])
      if (!scoped.length) throw new Error('المرشح خارج نطاق الفترة')
      rows.push({ personId: row.personId, reason: row.reason.trim(), evidence: (row.evidence || '').trim() })
    }
    result[key] = rows
  }
  return result
}

exports.metrics = async (req, res, next) => {
  try {
    const team = req.query.team || 'academic'
    if (!admin(req.user) && !(req.user.supervisionTeam === team && req.user.hasPermission?.('supervision.view')
      && ['manager', 'supervisor'].includes(req.user.supervisionPosition))) return sendError(res, 'الفريق خارج نطاقك', 403)
    const bounds = validPeriod(req.query)
    const ownSupervisor = !admin(req.user) && req.user.supervisionPosition === 'supervisor'
    if (ownSupervisor && req.query.supervisorId && req.query.supervisorId !== id(req.user)) return sendError(res, 'المشرف خارج نطاقك', 403)
    const supervisorId = ownSupervisor ? id(req.user) : req.query.supervisorId || undefined
    if (supervisorId && !oid(supervisorId)) return sendError(res, 'المشرف غير صالح', 400)
    if (supervisorId && !await User.exists({ _id: supervisorId, supervisionTeam: team, supervisionPosition: 'supervisor' })) return sendError(res, 'المشرف غير موجود', 404)
    if (req.query.category && (typeof req.query.category !== 'string' || req.query.category.length > 80)) return sendError(res, 'الفئة غير صالحة', 400)
    const result = await metrics({ team, ...bounds, supervisorId, shiftId: req.query.shiftId, category: req.query.category,
      evidence: req.query.evidence, page: req.query.page, teacherPage: req.query.teacherPage })
    sendSuccess(res, { ...result, period: bounds, scope: { team, supervisorId, shiftId: req.query.shiftId || null, category: req.query.category || null } })
  } catch (error) { if (/الفترة|تاريخ|الأسبوع|الشهر|الشيفت|الفريق/.test(error.message)) return sendError(res, error.message, 400); next(error) }
}

exports.list = async (req, res, next) => {
  try {
    if (!scopeUser(req.user)) return sendError(res, 'غير مصرح', 403)
    const { page, limit } = pageArgs(req.query)
    const filter = { team: 'academic' }
    if (supervisor(req.user)) filter.supervisorId = req.user._id
    else if (req.query.supervisorId) { if (!oid(req.query.supervisorId)) return sendError(res, 'المشرف غير صالح', 400); filter.supervisorId = req.query.supervisorId }
    if (reportType(req.query.type)) filter.type = req.query.type
    if (req.query.status && ['draft', 'submitted', 'changes_requested', 'approved'].includes(req.query.status)) filter.status = req.query.status
    const [rows, total] = await Promise.all([Report.find(filter).select('type supervisorId periodStart periodEnd status submittedAt reviewedAt version').sort({ periodStart: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('supervisorId', 'firstNameAr lastNameAr').lean(), Report.countDocuments(filter)])
    sendPaginated(res, rows, total, page, limit)
  } catch (error) { next(error) }
}

exports.detail = async (req, res, next) => {
  try {
    if (!scopeUser(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const row = await Report.findById(req.params.id).populate('supervisorId', 'firstNameAr lastNameAr').lean()
    if (!row || !canRead(req.user, row)) return sendError(res, 'التقرير غير موجود', 404)
    const live = await metrics({ team: 'academic', from: row.periodStart, to: row.periodEnd, supervisorId: id(row.supervisorId),
      shiftId: row.scope?.shiftId, category: row.scope?.category })
    const nomineeIds = [...new Set(nominations.flatMap((key) => (row.analysis?.[key] || []).map((item) => id(item.personId))))]
    const nomineePeople = nomineeIds.length ? await User.find({ _id: { $in: nomineeIds } }).select('firstNameAr lastNameAr').lean() : []
    sendSuccess(res, { ...row, sourcesChanged: !!row.sourceFingerprint && row.sourceFingerprint !== live.sourceFingerprint,
      liveMetrics: live, nomineePeople: Object.fromEntries(nomineePeople.map((person) => [id(person), person])) })
  } catch (error) { next(error) }
}

exports.save = async (req, res, next) => {
  try {
    if (!supervisor(req.user)) return sendError(res, 'المشرف الأكاديمي فقط يكتب تقريره', 403)
    const type = reportType(req.body.type)
    if (!type) return sendError(res, 'نوع التقرير غير صالح', 400)
    const bounds = periodBounds(req.body.start, type === 'R3' ? 'week' : 'month')
    const patch = await validateAnalysis(req.body.analysis || {}, req.user._id, bounds.from, bounds.to)
    let row = await Report.findOne({ type, supervisorId: req.user._id, periodStart: bounds.from })
    if (row && !['draft', 'changes_requested'].includes(row.status)) return sendError(res, 'التقرير المرسل لا يعدّل؛ اطلب استكماله من المدير', 409)
    if (!row) row = new Report({ type, supervisorId: req.user._id, periodStart: bounds.from, periodEnd: bounds.to,
      timezone: bounds.timezone, scope: { team: 'academic', supervisorId: req.user._id }, createdBy: req.user._id })
    row.analysis = { ...(row.analysis?.toObject?.() || row.analysis || {}), ...patch }
    row.revisions.push({ at: new Date(), by: req.user._id, action: row.isNew ? 'created' : 'draft_updated' })
    await row.save()
    await audit(req, 'academic_periodic_draft', row, { type, start: req.body.start })
    sendSuccess(res, row)
  } catch (error) { if (/غير صالح|أطول|المرشح|الترشيح|الأسبوع|الشهر|الفترة/.test(error.message)) return sendError(res, error.message, 400); next(error) }
}

exports.submit = async (req, res, next) => {
  try {
    if (!supervisor(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const row = await Report.findOne({ _id: req.params.id, supervisorId: req.user._id })
    if (!row) return sendError(res, 'التقرير غير موجود', 404)
    if (!['draft', 'changes_requested'].includes(row.status)) return sendError(res, 'التقرير مرسل بالفعل', 409)
    if (!row.analysis?.rating) return sendError(res, 'أضف التقييم الوصفي قبل الإرسال', 400)
    const current = await metrics({ team: 'academic', from: row.periodStart, to: row.periodEnd, supervisorId: id(row.supervisorId) })
    row.metricsSnapshot = current
    row.sourceFingerprint = current.sourceFingerprint
    row.shiftSnapshot = await require('../models/SupervisionShift').find({ team: 'academic', members: row.supervisorId,
      startsAt: { $lt: row.periodEnd }, endsAt: { $gt: row.periodStart }, cancelledAt: null })
      .select('name startsAt endsAt timezone').sort({ startsAt: 1 }).limit(1000).lean()
    row.status = 'submitted'; row.submittedAt = new Date(); row.version += 1
    row.revisions.push({ at: new Date(), by: req.user._id, action: 'submitted' })
    await row.save()
    await audit(req, 'academic_periodic_submit', row, { type: row.type, version: row.version })
    sendSuccess(res, row)
  } catch (error) { next(error) }
}

exports.review = async (req, res, next) => {
  try {
    if (!leader(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const decision = req.body.decision
    const note = text(req.body.note || '', 1000)
    if (!['approved', 'changes_requested'].includes(decision) || note === null || decision === 'changes_requested' && !note) return sendError(res, 'قرار المراجعة أو سببه غير صالح', 400)
    const row = await Report.findById(req.params.id)
    if (!row) return sendError(res, 'التقرير غير موجود', 404)
    if (row.status !== 'submitted') return sendError(res, 'التقرير ليس في انتظار المراجعة', 409)
    row.status = decision; row.reviewedAt = new Date(); row.reviewedBy = req.user._id; row.reviewNote = note
    row.revisions.push({ at: new Date(), by: req.user._id, action: decision, note })
    await row.save(); await audit(req, 'academic_periodic_review', row, { decision, note })
    sendSuccess(res, row)
  } catch (error) { next(error) }
}

exports.correct = async (req, res, next) => {
  try {
    if (!leader(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const reason = text(req.body.reason, 1000)
    if (!reason) return sendError(res, 'سبب التصحيح مطلوب', 400)
    const row = await Report.findById(req.params.id)
    if (!row) return sendError(res, 'التقرير غير موجود', 404)
    if (row.status !== 'approved') return sendError(res, 'يصحح التقرير المعتمد فقط', 409)
    const patch = await validateAnalysis(req.body.analysis || {}, null, row.periodStart, row.periodEnd)
    const previous = { version: row.version, analysis: row.analysis?.toObject?.() || row.analysis,
      metricsSnapshot: row.metricsSnapshot, sourceFingerprint: row.sourceFingerprint, approvedAt: row.reviewedAt }
    const current = await metrics({ team: 'academic', from: row.periodStart, to: row.periodEnd, supervisorId: id(row.supervisorId) })
    row.analysis = { ...(row.analysis?.toObject?.() || row.analysis || {}), ...patch }
    row.metricsSnapshot = current; row.sourceFingerprint = current.sourceFingerprint
    row.version += 1; row.reviewedAt = new Date(); row.reviewedBy = req.user._id
    row.revisions.push({ at: new Date(), by: req.user._id, action: 'approved_correction', note: reason, previous })
    await row.save(); await audit(req, 'academic_periodic_correction', row, { reason, version: row.version })
    sendSuccess(res, row)
  } catch (error) { if (/غير صالح|أطول|المرشح|الترشيح|الفترة/.test(error.message)) return sendError(res, error.message, 400); next(error) }
}

exports.search = async (req, res, next) => {
  try {
    if (!scopeUser(req.user)) return sendError(res, 'غير مصرح', 403)
    const term = String(req.query.q || '').trim().slice(0, 80)
    if (term.length < 2) return sendSuccess(res, { students: [], teachers: [], supervisors: [], sessions: [], reports: [] })
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(safe, 'i')
    const filter = { $or: [{ firstNameAr: regex }, { lastNameAr: regex }, { email: regex }] }
    const now = new Date()
    const [matchedTeachers, matchedStudents] = await Promise.all([
      User.find({ ...filter, role: 'teacher' }).select('firstNameAr lastNameAr').limit(30).lean(),
      User.find({ ...filter, role: 'student' }).select('firstNameAr lastNameAr').limit(30).lean(),
    ])
    const teacherIds = matchedTeachers.map((p) => p._id)
    const studentIds = matchedStudents.map((p) => p._id)
    const pairMatch = [teacherIds.length && { teacherId: { $in: teacherIds } }, studentIds.length && { studentId: { $in: studentIds } }].filter(Boolean)
    const ownedPairs = pairMatch.length ? await ScheduleRule.aggregate([
      { $match: { status: { $in: ['active', 'paused'] }, $or: pairMatch } },
      ...ownershipStages('academic', now),
      { $match: supervisor(req.user) ? { 'effectiveOwner.0.supervisorId': req.user._id }
        : { 'effectiveOwner.0': { $exists: true } } },
      { $group: { _id: null, teachers: { $addToSet: '$teacherId' }, students: { $addToSet: '$studentId' } } },
    ]) : []
    const ownedTeachers = new Set((ownedPairs[0]?.teachers || []).map(id))
    const ownedStudents = new Set((ownedPairs[0]?.students || []).map(id))
    const teachers = matchedTeachers.filter((person) => ownedTeachers.has(id(person))).slice(0, 5)
    const supervisors = leader(req.user) ? await User.find({ ...filter, supervisionTeam: 'academic', supervisionPosition: 'supervisor' })
      .select('firstNameAr lastNameAr').limit(5).lean() : []
    const students = matchedStudents.filter((person) => ownedStudents.has(id(person))).slice(0, 5)
    const sessions = await Session.aggregate([
      { $match: { titleAr: regex } }, ...ownershipStages('academic'),
      { $match: supervisor(req.user) ? { 'effectiveOwner.0.supervisorId': req.user._id }
        : { 'effectiveOwner.0': { $exists: true } } },
      { $sort: { scheduledAt: -1 } }, { $limit: 5 },
      { $project: { titleAr: 1, scheduledAt: 1, teacherId: 1, studentId: 1 } },
    ])
    const reports = await Observation.find({ ...(supervisor(req.user) ? { supervisorId: req.user._id } : {}),
      $or: [{ observations: regex }, { strengths: regex }, { improvements: regex }] }).select('sessionId scheduledAt supervisorId').sort({ scheduledAt: -1 }).limit(5).lean()
    sendSuccess(res, { students, teachers, supervisors, sessions, reports })
  } catch (error) { next(error) }
}

async function recognitionCandidates(bounds) {
  const sourceReports = await Report.find({ type: 'R4', status: 'approved', periodStart: bounds.from })
    .select('supervisorId version analysis.distinguishedStudents analysis.distinguishedTeachers').limit(500).lean()
  const expand = (field) => sourceReports.flatMap((report) => (report.analysis?.[field] || []).map((item) => ({
    personId: id(item.personId), sourceReportId: id(report._id), sourceVersion: report.version, reason: item.reason, evidence: item.evidence,
  })))
  const studentRows = expand('distinguishedStudents')
  const teacherRows = expand('distinguishedTeachers')
  const ids = [...new Set([...studentRows, ...teacherRows].map((item) => item.personId))]
  const users = ids.length ? await User.find({ _id: { $in: ids } }).select('firstNameAr lastNameAr gender role').lean() : []
  const byId = new Map(users.map((person) => [id(person), person]))
  return { students: studentRows.filter((item) => byId.get(item.personId)?.role === 'student').map((item) => ({ ...item, person: byId.get(item.personId) })),
    teachers: teacherRows.filter((item) => byId.get(item.personId)?.role === 'teacher').map((item) => ({ ...item, person: byId.get(item.personId) })) }
}

exports.recognition = async (req, res, next) => {
  try {
    if (!leader(req.user)) return sendError(res, 'غير مصرح', 403)
    const bounds = periodBounds(req.query.start, 'month')
    const [row, candidates] = await Promise.all([Recognition.findOne({ periodStart: bounds.from }).lean(), recognitionCandidates(bounds)])
    const current = [...candidates.students, ...candidates.teachers]
    const chosen = row ? [...(row.students || []), row.maleTeacher, row.femaleTeacher].filter(Boolean) : []
    const sourcesChanged = chosen.some((item) => !current.some((candidate) => candidate.personId === id(item.personId)
      && candidate.sourceReportId === id(item.sourceReportId) && candidate.sourceVersion === item.sourceVersion))
    sendSuccess(res, { row, candidates, period: bounds, sourcesChanged,
      note: 'اختيار بشري من ترشيحات R4 المعتمدة؛ لا يوجد ترتيب نقاط آلي أو نشر للطلاب والمعلمين.' })
  } catch (error) { if (/تاريخ|الشهر/.test(error.message)) return sendError(res, error.message, 400); next(error) }
}

exports.saveRecognition = async (req, res, next) => {
  try {
    if (!leader(req.user)) return sendError(res, 'غير مصرح', 403)
    const bounds = periodBounds(req.body.start, 'month')
    const candidates = await recognitionCandidates(bounds)
    const students = req.body.students || []
    if (!Array.isArray(students) || students.length > 10 || !students.length) return sendError(res, 'اختر من طالب واحد إلى عشرة طلاب', 400)
    const checked = new Set()
    function validatedPick(pick, pool, gender) {
      if (!pick || !oid(pick.personId) || !oid(pick.sourceReportId) || !text(pick.reason, 1000)) throw new Error('بيانات الاختيار غير صالحة')
      const match = pool.find((item) => item.personId === id(pick.personId) && item.sourceReportId === id(pick.sourceReportId)
        && (!gender || item.person?.gender === gender))
      if (!match) throw new Error('الاختيار ليس من ترشيح معتمد للفترة')
      return { personId: pick.personId, sourceReportId: pick.sourceReportId, sourceVersion: match.sourceVersion, reason: pick.reason.trim() }
    }
    const selected = students.map((pick) => { if (checked.has(id(pick.personId))) throw new Error('الطالب مكرر'); checked.add(id(pick.personId)); return validatedPick(pick, candidates.students) })
    const maleTeacher = req.body.maleTeacher ? validatedPick(req.body.maleTeacher, candidates.teachers, 'male') : undefined
    const femaleTeacher = req.body.femaleTeacher ? validatedPick(req.body.femaleTeacher, candidates.teachers, 'female') : undefined
    const note = text(req.body.note || '', 2000)
    if (note === null) return sendError(res, 'الملاحظة طويلة', 400)
    let row = await Recognition.findOne({ periodStart: bounds.from })
    if (row) {
      const reason = text(req.body.changeReason, 1000)
      if (!reason) return sendError(res, 'سبب تعديل الاختيارات المعتمدة مطلوب', 400)
      row.revisions.push({ at: new Date(), by: req.user._id, note: reason, previous: {
        students: row.students.map((item) => item.toObject()), maleTeacher: row.maleTeacher?.toObject(), femaleTeacher: row.femaleTeacher?.toObject(),
        note: row.note, selectedAt: row.selectedAt, selectedBy: row.selectedBy, version: row.version } })
      row.version += 1
    } else row = new Recognition({ periodStart: bounds.from, periodEnd: bounds.to, timezone: bounds.timezone })
    row.students = selected; row.maleTeacher = maleTeacher; row.femaleTeacher = femaleTeacher
    row.note = note; row.selectedBy = req.user._id; row.selectedAt = new Date()
    await row.save(); await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'academic_recognition_selection',
      entity: 'AcademicRecognition', entityId: row._id, changes: { start: req.body.start, version: row.version }, ip: req.ip })
    sendSuccess(res, row)
  } catch (error) { if (/تاريخ|الشهر|اختيار|الطالب مكرر|غير صالحة/.test(error.message)) return sendError(res, error.message, 400); next(error) }
}

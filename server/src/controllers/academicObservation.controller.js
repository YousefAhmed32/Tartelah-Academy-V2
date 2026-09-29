const mongoose = require('mongoose')
const Report = require('../models/AcademicObservationReport')
const Session = require('../models/Session')
const Assignment = require('../models/SupervisionAssignment')
const Shift = require('../models/SupervisionShift')
const Settings = require('../models/SupervisionSettings')
const User = require('../models/User')
const Action = require('../models/SupervisionDailyAction')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createNotification } = require('../services/notification.service')

const id = (value) => String(value?._id || value || '')
const admin = (user) => user.isPrimaryAdmin === true || user.role === 'admin' && user.hasPermission?.('supervision.view')
const adminCanManage = (user) => user.isPrimaryAdmin === true || user.role === 'admin' && user.hasPermission?.('supervision.manage')
const manager = (user) => user.supervisionTeam === 'academic' && user.supervisionPosition === 'manager'
const supervisor = (user) => user.supervisionTeam === 'academic' && user.supervisionPosition === 'supervisor'
const canRead = (user, row) => admin(user) || manager(user) || supervisor(user) && id(row.supervisorId) === id(user)
const fields = ['lessonFlow', 'studentLevel', 'teacherPerformance', 'observations', 'strengths', 'improvements', 'teacherGuidance', 'nextFollowUpPoint', 'closingNote', 'evidenceNote']
const ratings = ['excellent', 'very_good', 'good', 'needs_improvement']
const observationCategories = ['lesson_quality', 'teacher_commitment', 'student_progress', 'curriculum', 'attendance', 'technical', 'other']
const statuses = ['acknowledged', 'will_apply', 'applied', 'needs_discussion']
const person = 'firstNameAr lastNameAr'

function pageFor(req) {
  return { page: Math.max(1, Number.parseInt(req.query.page, 10) || 1), limit: Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 20)) }
}

async function assigned(session, user) {
  const teacherIds = [session.teacherId, session.supervisionOriginalTeacherId].filter(Boolean)
  return Assignment.exists({ team: 'academic', supervisorId: user._id, teacherId: { $in: teacherIds },
    startsAt: { $lte: session.scheduledAt }, $or: [{ endsAt: null }, { endsAt: { $gt: session.scheduledAt } }] })
}

async function scopeFor(session, user) {
  if (!supervisor(user) || !await assigned(session, user)) return null
  const shift = await Shift.findOne({ team: 'academic', members: user._id, cancelledAt: null,
    startsAt: { $lte: session.scheduledAt }, endsAt: { $gt: session.scheduledAt } })
    .sort({ endsAt: 1, _id: 1 }).select('_id endsAt').lean()
  if (!shift) return null
  const settings = await Settings.findOne({ team: 'academic' }).select('reportGraceMinutes').lean()
  return { shiftId: shift._id, dueAt: new Date(shift.endsAt.getTime() + (settings?.reportGraceMinutes ?? 120) * 60000) }
}

function patchFrom(body) {
  const patch = {}
  for (const key of fields) {
    if (body[key] === undefined) continue
    if (typeof body[key] !== 'string' || body[key].length > (key === 'evidenceNote' ? 1000 : 2000)) return null
    patch[key] = body[key].trim()
  }
  if (body.rating !== undefined) {
    if (body.rating !== '' && !ratings.includes(body.rating)) return null
    patch.rating = body.rating || null
  }
  if (body.observationCategory !== undefined) {
    if (body.observationCategory && !observationCategories.includes(body.observationCategory)) return null
    patch.observationCategory = body.observationCategory || null
  }
  if (body.followUpNeeded !== undefined) {
    if (typeof body.followUpNeeded !== 'boolean') return null
    patch.followUpNeeded = body.followUpNeeded
  }
  if (body.observation !== undefined) {
    if (!['observed', 'not_observed'].includes(body.observation) || !['manual_meeting', 'manual_other'].includes(body.observationSource)) return null
    patch.observation = body.observation
    patch.observationSource = body.observationSource
    const observedAt = body.observedAt ? new Date(body.observedAt) : new Date()
    if (body.observation === 'observed' && (Number.isNaN(observedAt.getTime()) || observedAt > new Date())) return null
    patch.observedAt = body.observation === 'observed' ? observedAt : null
  }
  return patch
}

function complete(row) {
  return row.observation === 'not_observed'
    ? !!row.evidenceNote && !row.rating && !row.teacherGuidance
    : row.observation === 'observed' && !!row.observedAt && !!row.lessonFlow && !!row.teacherPerformance && !!row.studentLevel && !!row.rating
}

async function nextSessionFor(row) {
  return Session.findOne({ studentId: row.studentId, teacherId: row.teacherId,
    scheduledAt: { $gt: row.scheduledAt }, _id: { $ne: row.sessionId },
    status: { $nin: ['cancelled', 'rescheduled'] } }).sort({ scheduledAt: 1 }).select('_id scheduledAt teacherId supervisionOriginalTeacherId status').lean()
}

async function ensureFollowUpAction(row) {
  if (!row.followUpNeeded) return null
  const nextSession = row.nextSessionId ? await Session.findById(row.nextSessionId).select('_id scheduledAt teacherId supervisionOriginalTeacherId status').lean() : await nextSessionFor(row)
  const target = nextSession && !['cancelled', 'rescheduled'].includes(nextSession.status) ? nextSession : null
  const ownerAssignment = target ? await Assignment.findOne({ team: 'academic',
    teacherId: { $in: [target.teacherId, target.supervisionOriginalTeacherId].filter(Boolean) },
    startsAt: { $lte: target.scheduledAt }, $or: [{ endsAt: null }, { endsAt: { $gt: target.scheduledAt } }] })
    .sort({ primary: -1, startsAt: -1 }).select('supervisorId').lean() : null
  const ownerId = ownerAssignment?.supervisorId || row.supervisorId
  let action
  try {
    action = await Action.findOneAndUpdate({ sourceAcademicReportId: row._id },
      { $setOnInsert: { sourceAcademicReportId: row._id, sessionId: target?._id || row.sessionId,
      team: 'academic', category: 'academic_guidance', ownerId, createdBy: row.supervisorId,
      description: (row.nextFollowUpPoint || row.teacherGuidance || 'راجع متابعة هذه الحصة في الحلقة القادمة').slice(0, 1000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true })
  } catch (error) {
    if (error.code !== 11000) throw error
    action = await Action.findOne({ sourceAcademicReportId: row._id })
  }
  if (target && action?.status === 'open' && id(action.sessionId) === id(row.sessionId)) {
    action = await Action.findOneAndUpdate({ _id: action._id, status: 'open', sessionId: row.sessionId },
      { $set: { sessionId: target._id, ownerId } }, { new: true }) || action
  }
  return action
}

async function notifySubmitted(row, teacherGuidance) {
  const [managers, primaryAdmins] = await Promise.all([
    User.find({ isActive: true, supervisionTeam: 'academic', supervisionPosition: 'manager' }).select('_id').lean(),
    User.find({ isActive: true, isPrimaryAdmin: true }).select('_id').lean(),
  ])
  const recipients = new Map([...managers, ...primaryAdmins].map((user) => [id(user), user._id]))
  const notifications = [...recipients.values()].map((userId) => ({ userId, type: 'report', titleAr: 'تقرير متابعة أكاديمية جديد',
    bodyAr: 'وصل تقرير متابعة حصة للمراجعة.', actionUrl: '/admin/supervision/academic-manager',
    relatedId: row._id, metadata: { reminderKey: `academic-report:${row._id}:${row.submissionVersion}` } }))
  if (teacherGuidance) notifications.push({ userId: row.teacherId, type: 'report', titleAr: 'توجيه أكاديمي جديد',
    bodyAr: 'وصل توجيه بشأن إحدى حصصك. يرجى الرد عليه في صندوق التوجيهات.', actionUrl: '/teacher/guidance',
    relatedId: row._id, metadata: { reminderKey: `academic-guidance:${row._id}:${row.teacherGuidanceVersion}` } })
  for (const notification of notifications) await createNotification(notification)
}

exports.list = async (req, res, next) => {
  try {
    if (!admin(req.user) && !manager(req.user) && !supervisor(req.user)) return sendError(res, 'غير مصرح', 403)
    const { page, limit } = pageFor(req)
    const filter = supervisor(req.user) ? { supervisorId: req.user._id } : {}
    if (req.query.status && ['draft', 'submitted', 'changes_requested', 'reviewed'].includes(req.query.status)) filter.status = req.query.status
    if (req.query.sessionId) {
      if (!mongoose.isValidObjectId(req.query.sessionId)) return sendError(res, 'الحصة غير صالحة', 400)
      filter.sessionId = req.query.sessionId
      if (supervisor(req.user)) {
        const session = await Session.findById(req.query.sessionId).select('teacherId supervisionOriginalTeacherId scheduledAt').lean()
        if (!session || !await assigned(session, req.user)) return sendError(res, 'غير مصرح لهذه الحصة', 403)
      }
    }
    const [rows, total] = await Promise.all([
      Report.find(filter).sort({ scheduledAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('teacherId', person).populate('studentId', person).populate('supervisorId', person).lean(),
      Report.countDocuments(filter),
    ])
    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) { next(error) }
}

exports.detail = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'التقرير غير صالح', 400)
    const row = await Report.findById(req.params.id).populate('teacherId', person).populate('studentId', person)
      .populate('supervisorId', person).populate('revisions.by', person).lean()
    if (!row) return sendError(res, 'التقرير غير موجود', 404)
    if (!canRead(req.user, row)) return sendError(res, 'غير مصرح', 403)
    const teacherReport = await require('../models/QuranSessionReport').findOne({ sessionId: row.sessionId })
      .select('status submittedAt todayRecitation todayRevision nextRecitation nextRevision memorizationLevel revisionLevel tajweedLevel engagementLevel generalEvaluation').lean()
    const previousFollowUp = await Report.findOne({ teacherId: row.teacherId?._id || row.teacherId,
      studentId: row.studentId?._id || row.studentId, scheduledAt: { $lt: row.scheduledAt },
      followUpNeeded: true, status: { $in: ['submitted', 'reviewed'] } }).sort({ scheduledAt: -1 })
      .select('sessionId teacherGuidance nextFollowUpPoint teacherReplyStatus teacherReply').lean()
    const followUpAction = await Action.findOne({ sourceAcademicReportId: row._id })
      .select('sessionId ownerId status resolution resolvedAt').populate('ownerId', person).lean()
    sendSuccess(res, { ...row, teacherReportStatus: teacherReport?.status || null, teacherReport, previousFollowUp, followUpAction })
  } catch (error) { next(error) }
}

exports.save = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.sessionId)) return sendError(res, 'الحصة غير صالحة', 400)
    const session = await Session.findById(req.params.sessionId).select('teacherId supervisionOriginalTeacherId studentId scheduledAt status').lean()
    if (!session || ['cancelled', 'rescheduled'].includes(session.status)) return sendError(res, 'الحصة غير متاحة', 404)
    const scope = await scopeFor(session, req.user)
    if (!scope) return sendError(res, 'هذه الحصة ليست ضمن تكليفك وشيفتك وقتها', 403)
    if (new Date() < session.scheduledAt) return sendError(res, 'تبدأ المتابعة عند موعد الحصة', 409)
    const patch = patchFrom(req.body || {})
    if (!patch) return sendError(res, 'بيانات التقرير غير صالحة', 400)
    if (patch.observedAt && patch.observedAt < new Date(session.scheduledAt.getTime() - 30 * 60000)) return sendError(res, 'وقت المتابعة يسبق موعد الحصة', 400)
    let row = await Report.findOne({ sessionId: session._id, supervisorId: req.user._id })
    if (!row) {
      if (!patch.observation) return sendError(res, 'حدد هل حضرت الحلقة ومصدر المعلومة', 400)
      try {
        row = await Report.create({ sessionId: session._id, supervisorId: req.user._id, teacherId: session.teacherId,
          studentId: session.studentId, scheduledAt: session.scheduledAt, ...scope, ...patch })
      } catch (error) {
        if (error.code === 11000) return sendError(res, 'تغير التقرير في جلسة أخرى، حدّث الصفحة', 409)
        throw error
      }
    } else {
      if (!['draft', 'changes_requested'].includes(row.status)) return sendError(res, 'التقرير أُرسل بالفعل؛ التعديل يحتاج مراجعة المدير', 409)
      if (patch.observation === row.observation && row.observedAt) patch.observedAt = row.observedAt
      const before = Object.fromEntries([...fields, 'rating', 'observationCategory', 'followUpNeeded', 'observation', 'observationSource', 'observedAt'].map((key) => [key, row[key]]))
      const updated = await Report.findOneAndUpdate({ _id: row._id, status: row.status, __v: row.__v },
        { $set: patch, $push: { revisions: { at: new Date(), by: req.user._id, action: 'draft_update', before } }, $inc: { __v: 1 } },
        { new: true, runValidators: true })
      if (!updated) return sendError(res, 'تغير التقرير في جلسة أخرى، حدّث الصفحة', 409)
      row = updated
    }
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'academic_observation_save', entity: 'AcademicObservationReport', entityId: row._id, changes: { sessionId: session._id, observation: row.observation }, ip: req.ip })
    sendSuccess(res, row, 'حُفظت المتابعة')
  } catch (error) { next(error) }
}

exports.submit = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'التقرير غير صالح', 400)
    const row = await Report.findById(req.params.id)
    if (!row) return sendError(res, 'التقرير غير موجود', 404)
    if (!supervisor(req.user) || id(row.supervisorId) !== id(req.user)) return sendError(res, 'غير مصرح', 403)
    if (!['draft', 'changes_requested'].includes(row.status) || !complete(row)) return sendError(res, 'أكمل بيانات المتابعة قبل الإرسال', 409)
    const session = await Session.findById(row.sessionId).select('status').lean()
    if (!session || !['completed', 'missed', 'no_show'].includes(session.status)) return sendError(res, 'انتظر انتهاء الحصة قبل إرسال التقرير', 409)
    const nextSession = row.followUpNeeded ? await nextSessionFor(row) : null
    const guidanceChanged = (row.teacherGuidance || '') !== (row.publishedTeacherGuidance || '')
    const updated = await Report.findOneAndUpdate({ _id: row._id, status: row.status, __v: row.__v },
      { $set: { status: 'submitted', submittedAt: new Date(), reviewedAt: null, reviewedBy: null,
        publishedTeacherGuidance: row.teacherGuidance || '',
        ...(guidanceChanged ? { teacherReplyStatus: row.teacherGuidance ? 'pending' : null, teacherReply: null, teacherRepliedAt: null } : {}),
        nextSessionId: nextSession?._id || null },
      $inc: { __v: 1, submissionVersion: 1, teacherGuidanceVersion: guidanceChanged ? 1 : 0 },
      $push: { revisions: { at: new Date(), by: req.user._id, action: 'submit', before: { status: row.status } } } },
      { new: true, runValidators: true })
    if (!updated) return sendError(res, 'تغير التقرير في جلسة أخرى، حدّث الصفحة', 409)
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'academic_observation_submit', entity: 'AcademicObservationReport', entityId: row._id, changes: { sessionId: row.sessionId, late: updated.submittedAt > row.dueAt }, ip: req.ip })
    await ensureFollowUpAction(updated).catch((error) => console.error('[academic-report] follow-up action retry needed:', error))
    await notifySubmitted(updated, guidanceChanged).catch((error) => console.error('[academic-report] notification retry needed:', error))
    sendSuccess(res, updated, 'وصل التقرير إلى المدير والإدارة، والتوجيه للمعلم إن وجد')
  } catch (error) { next(error) }
}

exports.review = async (req, res, next) => {
  try {
    if (!adminCanManage(req.user) && !manager(req.user)) return sendError(res, 'المراجعة لمدير الإشراف الأكاديمي أو الإدارة العامة', 403)
    if (!mongoose.isValidObjectId(req.params.id) || !['reviewed', 'changes_requested'].includes(req.body?.decision)) return sendError(res, 'قرار المراجعة غير صالح', 400)
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : ''
    if (note.length > 1000 || req.body.decision === 'changes_requested' && !note) return sendError(res, 'اكتب سبب طلب التعديل', 400)
    const row = await Report.findById(req.params.id)
    if (!row) return sendError(res, 'التقرير غير موجود', 404)
    if (row.status !== 'submitted') return sendError(res, 'التقرير ليس بانتظار المراجعة', 409)
    const updated = await Report.findOneAndUpdate({ _id: row._id, status: 'submitted', __v: row.__v },
      { $set: { status: req.body.decision, reviewedAt: new Date(), reviewedBy: req.user._id, reviewNote: note },
        $inc: { __v: 1 }, $push: { revisions: { at: new Date(), by: req.user._id, action: req.body.decision, before: { status: row.status }, note } } }, { new: true })
    if (!updated) return sendError(res, 'راجع التقرير بعد تحديثه', 409)
    if (req.body.decision === 'changes_requested') await createNotification({ userId: row.supervisorId, type: 'report', titleAr: 'تقرير يحتاج استكمالًا',
      bodyAr: note, actionUrl: '/admin/supervision/academic', relatedId: row._id,
      metadata: { reminderKey: `academic-review:${row._id}:${updated.__v}` } }).catch((error) => console.error('[academic-report] review notification:', error))
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'academic_observation_review', entity: 'AcademicObservationReport', entityId: row._id, changes: { decision: req.body.decision, note }, ip: req.ip })
    sendSuccess(res, updated, 'حُفظ قرار المراجعة')
  } catch (error) { next(error) }
}

exports.managerCorrect = async (req, res, next) => {
  try {
    if (!adminCanManage(req.user) && !manager(req.user)) return sendError(res, 'غير مصرح', 403)
    if (!mongoose.isValidObjectId(req.params.id) || typeof req.body?.reason !== 'string' || !req.body.reason.trim() || req.body.reason.length > 1000) return sendError(res, 'سبب التصحيح مطلوب', 400)
    const patch = patchFrom(req.body)
    if (!patch || patch.observation !== undefined || !Object.keys(patch).length) return sendError(res, 'بيانات التصحيح غير صالحة', 400)
    const row = await Report.findById(req.params.id)
    if (!row || !['submitted', 'reviewed'].includes(row.status)) return sendError(res, 'التقرير غير متاح للتصحيح', 409)
    const before = Object.fromEntries(Object.keys(patch).map((key) => [key, row[key]]))
    if (!complete({ ...row.toObject(), ...patch })) return sendError(res, 'التصحيح سيجعل التقرير غير مكتمل', 400)
    const guidanceChanged = patch.teacherGuidance !== undefined && patch.teacherGuidance !== row.teacherGuidance
    const updated = await Report.findOneAndUpdate({ _id: row._id, status: row.status, __v: row.__v },
      { $set: { ...patch, status: 'submitted', reviewedAt: null, reviewedBy: null,
        ...(guidanceChanged ? { publishedTeacherGuidance: patch.teacherGuidance || '', teacherReplyStatus: patch.teacherGuidance ? 'pending' : undefined, teacherReply: null, teacherRepliedAt: null } : {}) },
      $inc: { __v: 1, submissionVersion: 1, teacherGuidanceVersion: guidanceChanged ? 1 : 0 },
      $push: { revisions: { at: new Date(), by: req.user._id, action: 'manager_correction', before, note: req.body.reason.trim() } } }, { new: true, runValidators: true })
    if (!updated) return sendError(res, 'تغير التقرير في جلسة أخرى', 409)
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'academic_observation_correct', entity: 'AcademicObservationReport', entityId: row._id, changes: { before, after: patch, reason: req.body.reason.trim() }, ip: req.ip })
    if (updated.followUpNeeded) await ensureFollowUpAction(updated).catch((error) => console.error('[academic-report] correction follow-up:', error))
    else await Action.findOneAndUpdate({ sourceAcademicReportId: updated._id, status: 'open' },
      { $set: { status: 'resolved', resolution: 'أُلغي طلب المتابعة بعد تصحيح التقرير', resolvedAt: new Date(), resolvedBy: req.user._id } }).catch((error) => console.error('[academic-report] close cancelled follow-up:', error))
    await notifySubmitted(updated, guidanceChanged && !!updated.publishedTeacherGuidance).catch((error) => console.error('[academic-report] correction notification:', error))
    sendSuccess(res, updated, 'حُفظ التصحيح وتاريخه، والتقرير ينتظر إعادة المراجعة')
  } catch (error) { next(error) }
}

// The teacher API never returns internal narrative, rating, other students, or revision history.
exports.teacherInbox = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') return sendError(res, 'غير مصرح', 403)
    const { page, limit } = pageFor(req)
    const filter = { teacherId: req.user._id, submittedAt: { $exists: true }, publishedTeacherGuidance: { $nin: ['', null] }, status: { $in: ['submitted', 'reviewed', 'changes_requested'] } }
    const [rows, total] = await Promise.all([
      Report.find(filter).sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .select('sessionId scheduledAt publishedTeacherGuidance teacherReply teacherReplyStatus teacherRepliedAt submittedAt')
        .populate('sessionId', 'titleAr scheduledAt').lean(),
      Report.countDocuments(filter),
    ])
    res.json({ success: true, data: rows.map(({ publishedTeacherGuidance, ...row }) => ({ ...row, teacherGuidance: publishedTeacherGuidance })), total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) { next(error) }
}

exports.teacherReply = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' || !mongoose.isValidObjectId(req.params.id) || !statuses.includes(req.body?.status)) return sendError(res, 'رد غير صالح', 400)
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : ''
    if (note.length > 2000 || req.body.status === 'needs_discussion' && !note) return sendError(res, 'اكتب توضيحًا مختصرًا', 400)
    const row = await Report.findOne({ _id: req.params.id, teacherId: req.user._id, submittedAt: { $exists: true },
      publishedTeacherGuidance: { $nin: ['', null] }, status: { $in: ['submitted', 'reviewed', 'changes_requested'] } })
    if (!row) return sendError(res, 'التوجيه غير موجود', 404)
    const updated = await Report.findOneAndUpdate({ _id: row._id, __v: row.__v },
      { $set: { teacherReplyStatus: req.body.status, teacherReply: note, teacherRepliedAt: new Date() },
        $inc: { __v: 1 }, $push: { revisions: { at: new Date(), by: req.user._id, action: 'teacher_reply', before: { teacherReplyStatus: row.teacherReplyStatus, teacherReply: row.teacherReply } } } },
      { new: true }).select('sessionId scheduledAt teacherReply teacherReplyStatus teacherRepliedAt')
    if (!updated) return sendError(res, 'تغير التوجيه، حدّث الصفحة', 409)
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'academic_guidance_teacher_reply', entity: 'AcademicObservationReport', entityId: row._id, changes: { status: req.body.status }, ip: req.ip })
    const leaders = await User.find({ isActive: true, supervisionTeam: 'academic', supervisionPosition: 'manager' }).select('_id').lean()
    for (const recipientId of [...new Set([id(row.supervisorId), ...leaders.map(id)])]) {
      await createNotification({ userId: recipientId, type: 'report', titleAr: 'رد المعلم على توجيه الإشراف',
        bodyAr: 'سجل المعلم رده على التوجيه الأكاديمي. راجع تقرير المتابعة.',
        actionUrl: recipientId === id(row.supervisorId) ? '/admin/supervision/academic' : '/admin/supervision/academic-manager',
        relatedId: row._id, metadata: { reminderKey: `academic-guidance-reply:${row._id}:${updated.__v}` },
      }).catch((error) => console.error('[academic-report] reply notification:', error))
    }
    sendSuccess(res, updated, 'وصل ردك للإشراف')
  } catch (error) { next(error) }
}

exports.scopeFor = scopeFor
exports.complete = complete
exports.notifySubmitted = notifySubmitted
exports.ensureFollowUpAction = ensureFollowUpAction

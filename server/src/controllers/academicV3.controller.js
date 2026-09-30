const mongoose = require('mongoose')
const User = require('../models/User')
const Assignment = require('../models/SupervisionAssignment')
const CohortMember = require('../models/SupervisionCohortMember')
const ScheduleRule = require('../models/ScheduleRule')
const Subscription = require('../models/Subscription')
const Course = require('../models/Course')
const Subject = require('../models/TeachingSubject')
const Session = require('../models/Session')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const Evaluation = require('../models/Evaluation')
const Observation = require('../models/AcademicObservationReport')
const Plan = require('../models/StudentAcademicPlan')
const Directive = require('../models/AcademicDirective')
const Receipt = require('../models/AcademicDirectiveReceipt')
const Development = require('../models/AcademicDevelopmentCase')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createNotifications } = require('../services/notification.service')
const coverage = require('../services/supervisionCoverage.service')

const oid = (value) => mongoose.isValidObjectId(value)
const id = (value) => String(value?._id || value || '')
const admin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission?.('supervision.view')
const manager = (user) => user.supervisionTeam === 'academic' && user.supervisionPosition === 'manager' && user.hasPermission?.('supervision.view')
const supervisor = (user) => user.supervisionTeam === 'academic' && user.supervisionPosition === 'supervisor' && user.hasPermission?.('supervision.view')
const leader = (user) => admin(user) || manager(user)
const pagination = (query) => ({ page: Math.max(1, Number.parseInt(query.page, 10) || 1), limit: Math.min(30, Math.max(1, Number.parseInt(query.limit, 10) || 20)) })
const person = 'firstNameAr lastNameAr'
const statuses = ['acknowledged', 'will_apply', 'applied', 'needs_discussion']

function validText(value, max, required = false) {
  return typeof value === 'string' && value.trim().length <= max && (!required || !!value.trim())
}
function safeUrl(value) {
  if (!value) return true
  try { return new URL(value).protocol === 'https:' } catch { return false }
}
async function audit(req, action, entity, entityId, changes) {
  await logAction({ actorId: req.user._id, actorRole: req.user.role, action, entity, entityId, changes, ip: req.ip })
}
async function academicTeacherIds(supervisorId = null) {
  const now = new Date()
  const filter = { team: 'academic', ...(supervisorId ? { supervisorId } : {}),
    startsAt: { $lte: now }, $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }
  const [direct, cohorts] = await Promise.all([
    Assignment.distinct('teacherId', { ...filter, scopeType: { $ne: 'cohort' } }),
    Assignment.distinct('cohortId', { ...filter, scopeType: 'cohort' }),
  ])
  if (!cohorts?.length) return (direct || []).filter(Boolean)
  const students = await CohortMember.distinct('studentId', { team: 'academic', cohortId: { $in: cohorts },
    startsAt: { $lte: now }, $or: [{ endsAt: null }, { endsAt: { $gt: now } }] })
  const teachers = students.length ? await ScheduleRule.distinct('teacherId', { studentId: { $in: students }, status: { $in: ['active', 'paused'] } }) : []
  return [...new Map([...(direct || []), ...teachers].filter(Boolean).map((teacherId) => [id(teacherId), teacherId])).values()]
}
const assignedTeacherIds = (user) => academicTeacherIds(user._id)
async function supervisedStudentTeacherIds(user, studentId) {
  const rules = await ScheduleRule.find({ studentId, status: { $in: ['active', 'paused'] } }).select('teacherId').lean()
  if (!rules.length) return []
  const now = new Date()
  const sessions = rules.map((row) => ({ studentId, teacherId: row.teacherId, scheduledAt: now }))
  const { assignments, memberships } = await coverage.loadCoverage('academic', sessions)
  return [...new Map(sessions
    .filter((session) => id(coverage.resolveOwner(session, assignments, memberships)?.supervisorId) === id(user))
    .map((session) => [id(session.teacherId), session.teacherId])).values()]
}
async function canAccessStudent(user, studentId) {
  if (leader(user) || user.role === 'student' && id(user) === id(studentId)) return true
  if (user.role === 'teacher') return !!(await ScheduleRule.exists({ studentId, teacherId: user._id, status: 'active' })
    || await Subscription.exists({ studentId, teacherId: user._id, status: 'active' }))
  if (supervisor(user)) return (await supervisedStudentTeacherIds(user, studentId)).length > 0
  return false
}
function publicPlan(row, role) {
  const base = { _id: row._id, studentId: row.studentId, subjectKey: row.subjectKey, courseId: row.courseId,
    level: row.level, goal: row.goal, nextStep: row.nextStep,
    materialLinks: role === 'student' ? (row.materialLinks || []).filter((link) => link.visibility === 'shared') : row.materialLinks,
    status: row.status,
    updatedAt: row.updatedAt, milestones: (row.milestones || []).map((step) => ({ _id: step._id, title: step.title,
      status: step.status, completedAt: step.completedAt, externalTest: step.externalTest?.visibleToStudent || role === 'teacher'
        ? { testedAt: step.externalTest?.testedAt, result: step.externalTest?.result } : undefined })) }
  return base
}

exports.findStudents = async (req, res, next) => {
  try {
    if (!leader(req.user) && !supervisor(req.user)) return sendError(res, 'غير مصرح', 403)
    const search = String(req.query.search || '').trim().slice(0, 80)
    if (search.length < 2) return sendSuccess(res, [])
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const candidates = await User.find({ role: 'student', isActive: true,
      $or: [{ firstNameAr: new RegExp(safe, 'i') }, { lastNameAr: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }] })
      .select(person).limit(30).lean()
    let rows = candidates
    if (supervisor(req.user) && candidates.length) {
      const rules = await ScheduleRule.find({ studentId: { $in: candidates.map((row) => row._id) }, status: { $in: ['active', 'paused'] } })
        .select('studentId teacherId').lean()
      const now = new Date()
      const sessions = rules.map((row) => ({ studentId: row.studentId, teacherId: row.teacherId, scheduledAt: now }))
      const { assignments, memberships } = await coverage.loadCoverage('academic', sessions)
      const allowed = new Set(sessions.filter((session) => id(coverage.resolveOwner(session, assignments, memberships)?.supervisorId) === id(req.user)).map((row) => id(row.studentId)))
      rows = candidates.filter((row) => allowed.has(id(row)))
    }
    sendSuccess(res, rows.slice(0, 20))
  } catch (error) { next(error) }
}

exports.listPlans = async (req, res, next) => {
  try {
    const user = req.user
    if (!leader(user) && !supervisor(user) && user.role !== 'teacher' && user.role !== 'student') return sendError(res, 'غير مصرح', 403)
    const { page, limit } = pagination(req.query)
    const filter = {}
    if (user.role === 'student') filter.studentId = user._id
    else if (req.query.studentId) {
      if (!oid(req.query.studentId)) return sendError(res, 'الطالب غير صالح', 400)
      if (!await canAccessStudent(user, req.query.studentId)) return sendError(res, 'غير مصرح للطالب', 403)
      filter.studentId = req.query.studentId
    } else if (user.role === 'teacher' || supervisor(user)) return sendError(res, 'اختر الطالب أولًا', 400)
    if (user.role === 'student' || user.role === 'teacher') filter.status = 'published'
    const [rows, total] = await Promise.all([Plan.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('studentId', person).populate('courseId', 'nameAr category curriculum').lean(), Plan.countDocuments(filter)])
    sendPaginated(res, user.role === 'student' || user.role === 'teacher' ? rows.map((row) => publicPlan(row, user.role)) : rows, total, page, limit)
  } catch (error) { next(error) }
}

exports.savePlan = async (req, res, next) => {
  try {
    if (!leader(req.user) && !supervisor(req.user)) return sendError(res, 'غير مصرح', 403)
    const { studentId, subjectKey, courseId, level, goal, nextStep = '', individualNeeds = '', materialLinks = [], milestones = [] } = req.body
    if (!oid(studentId) || !validText(subjectKey, 80, true) || !validText(level, 200, true) || !validText(goal, 1000, true)
      || !validText(nextStep, 1000) || !validText(individualNeeds, 1000) || !Array.isArray(materialLinks) || materialLinks.length > 20
      || !materialLinks.every((item) => validText(item.title, 160, true) && validText(item.url, 1000, true) && safeUrl(item.url)
        && (!item.visibility || ['teacher_only', 'shared'].includes(item.visibility)))
      || !Array.isArray(milestones) || milestones.length > 30 || !milestones.every((item) => validText(item.title, 200, true))) return sendError(res, 'بيانات الخطة غير صالحة', 400)
    if (!await canAccessStudent(req.user, studentId)) return sendError(res, 'غير مصرح للطالب', 403)
    const [student, subject, course] = await Promise.all([
      User.findOne({ _id: studentId, role: 'student' }).select('_id').lean(),
      Subject.findOne({ key: subjectKey, isActive: true }).select('key').lean(),
      courseId && oid(courseId) ? Course.findById(courseId).select('nameAr category status isActive').lean() : null,
    ])
    if (!student || !subject || courseId && (!course || course.category !== subjectKey || course.status !== 'published' || !course.isActive)) return sendError(res, 'الطالب أو المنهج غير صالح', 400)
    const existing = await Plan.findOne({ studentId, subjectKey })
    const patch = { courseId: courseId || null, level: level.trim(), goal: goal.trim(), nextStep: nextStep.trim(), individualNeeds: individualNeeds.trim(),
      materialLinks: materialLinks.map(({ title, url, visibility }) => ({ title: title.trim(), url: url.trim(), visibility: visibility || 'teacher_only' })), updatedBy: req.user._id }
    if (existing) {
      if (existing.pendingRevision) return sendError(res, 'يوجد تعديل ينتظر قرار المدير؛ راجعه قبل تعديل الخطة مجددًا', 409)
      // Preserve the identity and recorded test of every existing milestone; its result is never overwritten by a plan edit.
      if (milestones.length && milestones.some((step) => step._id && !existing.milestones.id(step._id))) return sendError(res, 'مرحلة المنهج غير صالحة', 400)
      if (milestones.length) patch.milestones = [
        ...existing.milestones.map((step) => step.toObject()),
        ...milestones.filter((step) => !step._id).map((step) => ({ title: step.title.trim() })),
      ]
      if (patch.milestones?.length > 30) return sendError(res, 'الحد الأقصى لمراحل المنهج 30', 400)
      if (supervisor(req.user) && existing.status === 'published') {
        existing.pendingRevision = { ...patch, courseName: course?.nameAr || '' }
        await existing.save()
        await audit(req, 'academic_plan_revision_proposed', 'StudentAcademicPlan', existing._id, { studentId, subjectKey })
        return sendSuccess(res, existing, 'حُفظ التعديل وينتظر مراجعة المدير')
      }
      Object.assign(existing, patch)
      await existing.save()
      await audit(req, 'academic_plan_update', 'StudentAcademicPlan', existing._id, { studentId, subjectKey })
      return sendSuccess(res, existing)
    }
    const row = await Plan.create({ studentId, subjectKey, ...patch, milestones: milestones.map((step) => ({ title: step.title.trim() })), createdBy: req.user._id })
    await audit(req, 'academic_plan_create', 'StudentAcademicPlan', row._id, { studentId, subjectKey })
    sendSuccess(res, row, 'تم إنشاء خطة الطالب', 201)
  } catch (error) { if (error.code === 11000 || error.name === 'VersionError') return sendError(res, 'الخطة تغيرت؛ أعد تحميلها', 409); next(error) }
}

exports.publishPlan = async (req, res, next) => {
  try {
    if (!leader(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const row = await Plan.findById(req.params.id)
    if (!row) return sendError(res, 'الخطة غير موجودة', 404)
    if (!['published', 'archived', 'rejected'].includes(req.body.status)) return sendError(res, 'حالة نشر غير صالحة', 400)
    if (req.body.status === 'rejected') {
      if (!row.pendingRevision) return sendError(res, 'لا يوجد تعديل معلّق', 409)
      row.pendingRevision = undefined
      await row.save()
      await audit(req, 'academic_plan_revision_rejected', 'StudentAcademicPlan', row._id, {})
      return sendSuccess(res, row, 'رُفض التعديل وبقيت الخطة المنشورة كما هي')
    }
    if (req.body.status === 'archived' && row.pendingRevision) return sendError(res, 'اقبل التعديل المعلّق أو ارفضه أولًا', 409)
    if (req.body.status === 'published' && row.pendingRevision) {
      Object.assign(row, row.pendingRevision)
      row.pendingRevision = undefined
    }
    row.status = req.body.status
    row.publishedAt = row.status === 'published' ? new Date() : row.publishedAt
    row.publishedBy = req.user._id
    await row.save()
    await audit(req, 'academic_plan_status', 'StudentAcademicPlan', row._id, { status: row.status })
    sendSuccess(res, row)
  } catch (error) { if (error.name === 'VersionError') return sendError(res, 'الخطة تغيرت؛ أعد تحميلها', 409); next(error) }
}

exports.updateMilestone = async (req, res, next) => {
  try {
    if ((!leader(req.user) && !supervisor(req.user)) || !oid(req.params.id) || !oid(req.params.milestoneId)) return sendError(res, 'غير مصرح', 403)
    const row = await Plan.findById(req.params.id)
    if (!row) return sendError(res, 'الخطة غير موجودة', 404)
    if (!await canAccessStudent(req.user, row.studentId)) return sendError(res, 'غير مصرح للطالب', 403)
    const step = row.milestones.id(req.params.milestoneId)
    if (!step) return sendError(res, 'مرحلة المنهج غير موجودة', 404)
    const { status, sourceSessionId, test } = req.body
    if (status && !['planned', 'in_progress', 'completed'].includes(status)) return sendError(res, 'حالة غير صالحة', 400)
    if (sourceSessionId) {
      if (!oid(sourceSessionId)) return sendError(res, 'الحصة غير صالحة', 400)
      const source = await Session.findOne({ _id: sourceSessionId, studentId: row.studentId }).select('_id status').lean()
      if (!source || source.status !== 'completed') return sendError(res, 'الحصة المصدر غير مكتملة', 400)
      step.sourceSessionId = sourceSessionId
    }
    if (status && step.externalTest?.testedAt && status !== 'completed') return sendError(res, 'لا يمكن إعادة مرحلة ذات اختبار مسجل إلى غير مكتملة', 409)
    if (status) { step.status = status; step.completedAt = status === 'completed' ? step.completedAt || new Date() : null }
    if (test !== undefined) {
      if (step.status !== 'completed' || !test || !validText(test.result, 500, true) || !validText(test.note || '', 1000)
        || typeof test.visibleToStudent !== 'boolean' || Number.isNaN(new Date(test.testedAt).getTime()) || new Date(test.testedAt) > new Date()) return sendError(res, 'بيانات نتيجة الاختبار غير صالحة', 400)
      step.externalTest = { testedAt: new Date(test.testedAt), result: test.result.trim(), note: (test.note || '').trim(),
        recordedBy: req.user._id, visibleToStudent: test.visibleToStudent }
    }
    row.updatedBy = req.user._id
    await row.save()
    await audit(req, 'academic_plan_milestone', 'StudentAcademicPlan', row._id, { milestoneId: step._id, status: step.status, testRecorded: !!test })
    sendSuccess(res, row)
  } catch (error) { if (error.name === 'VersionError') return sendError(res, 'الخطة تغيرت؛ أعد تحميلها', 409); next(error) }
}

exports.studentOverview = async (req, res, next) => {
  try {
    const studentId = req.params.studentId === 'me' ? req.user._id : req.params.studentId
    if (!oid(studentId)) return sendError(res, 'غير مصرح للطالب', 403)
    const supervisedTeachers = supervisor(req.user) ? await supervisedStudentTeacherIds(req.user, studentId) : null
    if (supervisedTeachers ? !supervisedTeachers.length : !await canAccessStudent(req.user, studentId)) return sendError(res, 'غير مصرح للطالب', 403)
    const teacherScope = req.user.role === 'teacher' ? { teacherId: req.user._id }
      : supervisedTeachers ? { teacherId: { $in: supervisedTeachers } } : {}
    const [memorized, revised, evaluations, reports] = await Promise.all([
      Memorization.find({ studentId, ...teacherScope }).sort({ recordedAt: -1 }).limit(10).select('teacherId surahNumber fromAyah toAyah quality recordedAt').lean(),
      Revision.find({ studentId, ...teacherScope }).sort({ recordedAt: -1 }).limit(10).select('teacherId surahNumber fromAyah toAyah quality recordedAt').lean(),
      Evaluation.find({ studentId, ...teacherScope, ...(req.user.role === 'student' ? { isSharedWithStudent: true } : {}) }).sort({ createdAt: -1 }).limit(10)
        .select('teacherId type score notesAr strengths improvements isSharedWithStudent createdAt').lean(),
      req.user.role === 'student' || req.user.role === 'teacher' ? [] : Observation.find({ studentId, ...(supervisor(req.user) ? { supervisorId: req.user._id } : {}), status: { $in: ['submitted', 'reviewed'] } })
        .sort({ scheduledAt: -1 }).limit(10).select('sessionId supervisorId studentLevel observations scheduledAt').lean(),
    ])
    sendSuccess(res, { memorized, revised, evaluations, observations: reports })
  } catch (error) { next(error) }
}

exports.teacherOverview = async (req, res, next) => {
  try {
    if (!leader(req.user) && !supervisor(req.user)) return sendError(res, 'غير مصرح', 403)
    if (!oid(req.params.teacherId)) return sendError(res, 'المعلم غير صالح', 400)
    if (supervisor(req.user) && !(await assignedTeacherIds(req.user)).some((teacherId) => id(teacherId) === req.params.teacherId)) return sendError(res, 'المعلم خارج نطاقك', 403)
    if (manager(req.user) && !(await academicTeacherIds()).some((teacherId) => id(teacherId) === req.params.teacherId)) return sendError(res, 'المعلم خارج تكليفات الفريق', 403)
    const teacher = await User.findOne({ _id: req.params.teacherId, role: 'teacher' }).select('firstNameAr lastNameAr specializations audienceCategories bioAr').lean()
    if (!teacher) return sendError(res, 'المعلم غير موجود', 404)
    const reportFilter = { teacherId: teacher._id, ...(supervisor(req.user) ? { supervisorId: req.user._id } : {}), status: { $in: ['submitted', 'reviewed'] } }
    const [reports, total, scheduledStudents, subscribedStudents, directives, development] = await Promise.all([
      Observation.find(reportFilter).sort({ scheduledAt: -1 }).limit(20)
        .select('sessionId supervisorId scheduledAt rating strengths improvements followUpNeeded nextFollowUpPoint teacherReplyStatus teacherReply').lean(),
      Observation.countDocuments(reportFilter),
      ScheduleRule.distinct('studentId', { teacherId: teacher._id, status: { $in: ['active', 'paused'] } }),
      Subscription.distinct('studentId', { teacherId: teacher._id, status: 'active' }),
      leader(req.user) ? Receipt.find({ recipientId: teacher._id }).sort({ createdAt: -1 }).limit(20)
        .populate('directiveId', 'title body createdAt').select('directiveId status reply respondedAt verifiedAt').lean() : [],
      leader(req.user) ? Development.find({ personId: teacher._id }).sort({ updatedAt: -1 }).limit(20).lean() : [],
    ])
    sendSuccess(res, { teacher, reports, total, studentCount: new Set([...scheduledStudents, ...subscribedStudents].map(id)).size, directives, development: leader(req.user) ? development : [] })
  } catch (error) { next(error) }
}

exports.supervisorOverview = async (req, res, next) => {
  try {
    if (!leader(req.user) || !oid(req.params.supervisorId)) return sendError(res, 'غير مصرح', 403)
    const staff = await User.findOne({ _id: req.params.supervisorId, supervisionTeam: 'academic', supervisionPosition: 'supervisor' })
      .select('firstNameAr lastNameAr supervisionCategories').lean()
    if (!staff) return sendError(res, 'المشرف غير موجود', 404)
    const [reports, reportCount, assignments, directives, development] = await Promise.all([
      Observation.find({ supervisorId: staff._id, status: { $in: ['submitted', 'reviewed'] } }).sort({ scheduledAt: -1 }).limit(20)
        .select('sessionId teacherId studentId scheduledAt rating followUpNeeded nextFollowUpPoint').lean(),
      Observation.countDocuments({ supervisorId: staff._id, status: { $in: ['submitted', 'reviewed'] } }),
      Assignment.countDocuments({ team: 'academic', supervisorId: staff._id, startsAt: { $lte: new Date() },
        $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] }),
      Receipt.find({ recipientId: staff._id }).sort({ createdAt: -1 }).limit(20)
        .populate('directiveId', 'title body createdAt').select('directiveId status reply respondedAt verifiedAt').lean(),
      Development.find({ personId: staff._id }).sort({ updatedAt: -1 }).limit(20).lean(),
    ])
    sendSuccess(res, { staff, reports, reportCount, assignmentCount: assignments, directives, development })
  } catch (error) { next(error) }
}

exports.createDevelopment = async (req, res, next) => {
  try {
    if (!leader(req.user)) return sendError(res, 'غير مصرح', 403)
    const { personId, title, strengths = '', improvement, nextAction, sourceObservationId } = req.body
    if (!oid(personId) || !validText(title, 160, true) || !validText(strengths, 1000)
      || !validText(improvement, 1000, true) || !validText(nextAction, 1000, true)
      || sourceObservationId && !oid(sourceObservationId)) return sendError(res, 'بيانات المتابعة غير صالحة', 400)
    const personRow = await User.findById(personId).select('role supervisionTeam supervisionPosition isActive').lean()
    const type = personRow?.role === 'teacher' ? 'teacher' : personRow?.supervisionTeam === 'academic' && personRow?.supervisionPosition === 'supervisor' ? 'supervisor' : null
    if (!type || !personRow.isActive) return sendError(res, 'الشخص خارج فريق المتابعة الأكاديمية', 400)
    if (type === 'teacher' && !admin(req.user)) {
      const active = (await academicTeacherIds()).some((teacherId) => id(teacherId) === id(personId))
      if (!active) return sendError(res, 'المعلم خارج تكليفات الفريق', 403)
    }
    if (sourceObservationId) {
      const report = await Observation.findOne({ _id: sourceObservationId, ...(type === 'teacher' ? { teacherId: personId } : { supervisorId: personId }),
        status: { $in: ['submitted', 'reviewed'] } }).select('_id').lean()
      if (!report) return sendError(res, 'تقرير المتابعة المصدر غير صالح', 400)
    }
    const row = await Development.create({ personId, personType: type, authorId: req.user._id, title: title.trim(), strengths: strengths.trim(),
      improvement: improvement.trim(), nextAction: nextAction.trim(), sourceObservationId: sourceObservationId || null,
      history: [{ at: new Date(), by: req.user._id, status: 'open', outcome: '' }] })
    await audit(req, 'academic_development_create', 'AcademicDevelopmentCase', row._id, { personId, personType: type })
    sendSuccess(res, row, 'تم فتح متابعة التطوير', 201)
  } catch (error) { next(error) }
}

exports.updateDevelopment = async (req, res, next) => {
  try {
    if (!leader(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const { status, outcome = '' } = req.body
    if (!['open', 'improving', 'improved'].includes(status) || !validText(outcome, 1000)
      || status === 'improved' && !outcome.trim()) return sendError(res, 'حالة المتابعة غير صالحة', 400)
    const row = await Development.findById(req.params.id)
    if (!row) return sendError(res, 'المتابعة غير موجودة', 404)
    if (row.history.length >= 100) return sendError(res, 'بلغ سجل هذه المتابعة حده؛ افتح متابعة جديدة', 409)
    row.status = status
    row.outcome = outcome.trim()
    row.history.push({ at: new Date(), by: req.user._id, status, outcome: row.outcome })
    await row.save()
    await audit(req, 'academic_development_update', 'AcademicDevelopmentCase', row._id, { status })
    sendSuccess(res, row)
  } catch (error) { if (error.name === 'VersionError') return sendError(res, 'المتابعة تغيرت؛ أعد تحميلها', 409); next(error) }
}

async function directiveRecipients(body) {
  const assignments = await academicTeacherIds()
  if (body.targetType === 'person') {
    if (!oid(body.targetId)) return []
    return User.find({ _id: body.targetId, isActive: true,
      $or: [{ _id: { $in: assignments }, role: 'teacher' }, { supervisionTeam: 'academic', supervisionPosition: 'supervisor' }] }).select('_id role').lean()
  }
  if (body.targetType !== 'category' && body.targetType !== 'all') return []
  const category = body.targetType === 'category' ? body.categoryKey : null
  if (category && !await Subject.exists({ key: category, isActive: true })) return []
  return User.find({ isActive: true, $or: [
    { _id: { $in: assignments }, role: 'teacher', ...(category ? { specializations: category } : {}) },
    { supervisionTeam: 'academic', supervisionPosition: 'supervisor', ...(category ? { supervisionCategories: category } : {}) },
  ] }).select('_id role').lean()
}

exports.searchDirectiveRecipients = async (req, res, next) => {
  try {
    if (!leader(req.user)) return sendError(res, 'غير مصرح', 403)
    const search = String(req.query.search || '').trim().slice(0, 80)
    if (search.length < 2) return sendSuccess(res, [])
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const assignments = await academicTeacherIds()
    const rows = await User.find({ isActive: true, $and: [
      { $or: [{ _id: { $in: assignments }, role: 'teacher' }, { supervisionTeam: 'academic', supervisionPosition: 'supervisor' }] },
      { $or: [{ firstNameAr: new RegExp(safe, 'i') }, { lastNameAr: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }] },
    ] }).select('firstNameAr lastNameAr role').limit(30).lean()
    sendSuccess(res, rows)
  } catch (error) { next(error) }
}

exports.createDirective = async (req, res, next) => {
  try {
    if (!leader(req.user)) return sendError(res, 'غير مصرح', 403)
    const body = req.body
    if (!validText(body.title, 160, true) || !validText(body.body, 3000, true)
      || !validText(body.materialUrl || '', 1000) || !safeUrl(body.materialUrl)
      || !['person', 'category', 'all'].includes(body.targetType)) return sendError(res, 'بيانات التوجيه غير صالحة', 400)
    const recipients = await directiveRecipients(body)
    if (!recipients.length) return sendError(res, 'لا يوجد مستلمون صالحون ضمن الفريق الأكاديمي', 400)
    const row = await Directive.create({ authorId: req.user._id, title: body.title.trim(), body: body.body.trim(),
      materialUrl: body.materialUrl?.trim() || '', targetType: body.targetType,
      targetId: body.targetType === 'person' ? body.targetId : undefined,
      categoryKey: body.targetType === 'category' ? body.categoryKey : undefined, recipientCount: recipients.length })
    try {
      for (let offset = 0; offset < recipients.length; offset += 200) {
        await Receipt.insertMany(recipients.slice(offset, offset + 200).map((user) => ({ directiveId: row._id, recipientId: user._id })))
      }
    }
    catch (error) { await Receipt.deleteMany({ directiveId: row._id }); await Directive.deleteOne({ _id: row._id }); throw error }
    await audit(req, 'academic_directive_create', 'AcademicDirective', row._id, { targetType: row.targetType, recipientCount: row.recipientCount })
    try {
      for (let offset = 0; offset < recipients.length; offset += 100) {
        await createNotifications(recipients.slice(offset, offset + 100).map((user) => ({ userId: user._id, type: 'report', titleAr: 'توجيه أكاديمي جديد',
          bodyAr: 'وصلتك مهمة متابعة من مدير الإشراف الأكاديمي.', actionUrl: user.role === 'teacher' ? '/teacher/guidance' : '/admin/supervision/academic',
          relatedId: row._id, metadata: { dedupeKey: `academic-directive:${row._id}:${user._id}` } })))
      }
    } catch (notificationError) { console.error('[academic-directive] Notification failed after saving directive:', notificationError) }
    sendSuccess(res, row, 'تم إرسال التوجيه للمستلمين', 201)
  } catch (error) { next(error) }
}

exports.listDirectives = async (req, res, next) => {
  try {
    const { page, limit } = pagination(req.query)
    if (!leader(req.user) && !supervisor(req.user) && req.user.role !== 'teacher') return sendError(res, 'غير مصرح', 403)
    if (leader(req.user)) {
      const [rows, total] = await Promise.all([Directive.find({}).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Directive.countDocuments({})])
      const counts = await Receipt.aggregate([{ $match: { directiveId: { $in: rows.map((row) => row._id) } } },
        { $group: { _id: { directiveId: '$directiveId', status: '$status' }, count: { $sum: 1 } } }])
      return sendPaginated(res, rows.map((row) => ({ ...row, statusCounts: Object.fromEntries(counts.filter((entry) => id(entry._id.directiveId) === id(row._id))
        .map((entry) => [entry._id.status, entry.count])) })), total, page, limit)
    }
    const [receipts, total] = await Promise.all([Receipt.find({ recipientId: req.user._id }).sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit).limit(limit).populate('directiveId', 'title body materialUrl authorId createdAt').lean(), Receipt.countDocuments({ recipientId: req.user._id })])
    sendPaginated(res, receipts.filter((r) => r.directiveId), total, page, limit)
  } catch (error) { next(error) }
}

exports.directiveReceipts = async (req, res, next) => {
  try {
    if (!leader(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const { page, limit } = pagination(req.query)
    const filter = { directiveId: req.params.id }
    const [rows, total] = await Promise.all([Receipt.find(filter).sort({ createdAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit)
      .populate('recipientId', person).select('directiveId recipientId status reply respondedAt verifiedAt').lean(), Receipt.countDocuments(filter)])
    sendPaginated(res, rows, total, page, limit)
  } catch (error) { next(error) }
}

exports.replyDirective = async (req, res, next) => {
  try {
    if (!oid(req.params.id) || !statuses.includes(req.body.status) || !validText(req.body.reply || '', 2000)
      || req.body.status === 'needs_discussion' && !validText(req.body.reply, 2000, true)) return sendError(res, 'الرد غير صالح', 400)
    const row = await Receipt.findOneAndUpdate({ _id: req.params.id, recipientId: req.user._id },
      { $set: { status: req.body.status, reply: (req.body.reply || '').trim(), respondedAt: new Date(), verifiedAt: null, verifiedBy: null } }, { new: true })
    if (!row) return sendError(res, 'التوجيه غير موجود', 404)
    await audit(req, 'academic_directive_reply', 'AcademicDirectiveReceipt', row._id, { status: row.status })
    sendSuccess(res, row)
  } catch (error) { next(error) }
}

exports.verifyDirective = async (req, res, next) => {
  try {
    if (!leader(req.user) || !oid(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const row = await Receipt.findOneAndUpdate({ _id: req.params.id, status: 'applied' },
      { $set: { verifiedAt: new Date(), verifiedBy: req.user._id } }, { new: true })
    if (!row) return sendError(res, 'لا يمكن اعتماد توجيه لم يُنفذ', 409)
    await audit(req, 'academic_directive_verify', 'AcademicDirectiveReceipt', row._id, {})
    sendSuccess(res, row)
  } catch (error) { next(error) }
}

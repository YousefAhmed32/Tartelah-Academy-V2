const mongoose = require('mongoose')
const Session = require('../models/Session')
const Assignment = require('../models/SupervisionAssignment')
const Shift = require('../models/SupervisionShift')
const User = require('../models/User')
const QuranSessionReport = require('../models/QuranSessionReport')
const Action = require('../models/SupervisionDailyAction')
const Dispatch = require('../models/SupervisionDayDispatch')
const AcademicReport = require('../models/AcademicObservationReport')
const Settings = require('../models/SupervisionSettings')
const coverage = require('../services/supervisionCoverage.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { createNotification, createNotifications } = require('../services/notification.service')
const { logAction } = require('../services/audit.service')

const id = (value) => String(value?._id || value || '')
const isAdmin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.view')
const isManager = (user) => user.supervisionPosition === 'manager'
const validDate = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null
const activeAt = (row, at) => row.startsAt <= at && (!row.endsAt || row.endsAt > at)

function teamFor(req, res) {
  const team = req.query.team || req.body?.team || req.user.supervisionTeam
  if (!['academic', 'administrative'].includes(team) || !isAdmin(req.user) && req.user.supervisionTeam !== team) {
    sendError(res, 'لا يمكنك عرض هذا الفريق', 403)
    return null
  }
  return team
}

function period(req, res) {
  const from = validDate(req.query.from || req.body?.from)
  const to = validDate(req.query.to || req.body?.to)
  if (!from || !to || to <= from || to - from > 48 * 3600000) {
    sendError(res, 'اختر بداية ونهاية لفترة لا تتجاوز يومين', 400)
    return null
  }
  return { from, to }
}

async function assignmentsFor(team, from, to, user) {
  const filter = { team, startsAt: { $lt: to }, $or: [{ endsAt: null }, { endsAt: { $gt: from } }] }
  if (!isAdmin(user) && !isManager(user)) filter.supervisorId = user._id
  return Assignment.find(filter).select('teacherId supervisorId startsAt endsAt primary').lean()
}

function sessionFilter(from, to, assignments, user) {
  const filter = { scheduledAt: { $gte: from, $lt: to }, status: { $nin: ['cancelled', 'rescheduled'] } }
  if (!isAdmin(user)) {
    // Match the assignment interval in Mongo, before pagination. A teacher
    // changing supervisor at noon must not expose the morning sessions.
    filter.$or = assignments.flatMap((row) => ['teacherId', 'supervisionOriginalTeacherId'].map((field) => ({
      [field]: row.teacherId,
      scheduledAt: { $gte: new Date(Math.max(from, row.startsAt)), $lt: new Date(Math.min(to, row.endsAt || to)) },
    })))
    if (!filter.$or.length) filter.teacherId = { $in: [] }
  }
  return filter
}

async function canAccessSession(user, team, session) {
  if (isAdmin(user)) return true
  if (user.supervisionTeam !== team) return false
  const complex = await Assignment.countDocuments({ team, scopeType: { $in: ['student', 'cohort'] }, startsAt: { $lte: session.scheduledAt }, $or: [{ endsAt: null }, { endsAt: { $gt: session.scheduledAt } }] })
  if (complex) {
    const owner = await coverage.ownerForSession(team, session)
    return !!owner && (isManager(user) || id(owner.supervisorId) === id(user))
  }
  return !!await Assignment.exists({
    team, teacherId: { $in: [session.teacherId, session.supervisionOriginalTeacherId].filter(Boolean) }, ...(!isManager(user) ? { supervisorId: user._id } : {}),
    startsAt: { $lte: session.scheduledAt }, $or: [{ endsAt: null }, { endsAt: { $gt: session.scheduledAt } }],
  })
}

exports.list = async (req, res, next) => {
  try {
    const team = teamFor(req, res); if (!team) return
    const range = period(req, res); if (!range) return
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
    const lateStart = req.query.lateStart === 'true' && team === 'administrative'
    const complex = await Assignment.countDocuments({ team, scopeType: { $in: ['student', 'cohort'] }, startsAt: { $lt: range.to }, $or: [{ endsAt: null }, { endsAt: { $gt: range.from } }] })
    const assignments = complex ? [] : await assignmentsFor(team, range.from, range.to, req.user)
    const filter = complex ? null : sessionFilter(range.from, range.to, assignments, req.user)
    if (filter && lateStart) { filter.status = { $in: ['scheduled', 'missed'] }; filter.teacherStartedAt = null }
    if (req.query.sessionId) {
      if (!mongoose.isValidObjectId(req.query.sessionId)) return sendError(res, 'الحصة غير صالحة', 400)
      if (filter) { filter._id = req.query.sessionId; delete filter.status }
    }
    const legacyResult = complex ? null : await Promise.all([
      Session.find(filter).select('_id teacherId supervisionOriginalTeacherId studentId titleAr scheduledAt durationMinutes status meetingLink teacherStartedAt studentLinkOpenedAt teacherLinkOpenedAt actualStartAt completedAt quranReportRequired isMakeup administrativeReadiness')
        .sort({ scheduledAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit)
        .populate('teacherId', 'firstNameAr lastNameAr').populate('studentId', 'firstNameAr lastNameAr').lean(),
      Session.countDocuments(filter),
    ])
    const resolvedResult = complex ? await coverage.listOwnedSessions({ team, ...range, userId: req.user._id, manager: isManager(req.user), admin: isAdmin(req.user), page, limit, lateStart, sessionId: req.query.sessionId ? new mongoose.Types.ObjectId(req.query.sessionId) : null }) : null
    const rows = complex ? await Session.populate(resolvedResult.rows, [{ path: 'teacherId', select: 'firstNameAr lastNameAr' }, { path: 'studentId', select: 'firstNameAr lastNameAr' }]) : legacyResult[0]
    const total = complex ? resolvedResult.total : legacyResult[1]
    const sessionIds = rows.map((row) => row._id)
    const teacherIds = [...new Set(rows.flatMap((row) => [id(row.teacherId), id(row.supervisionOriginalTeacherId)].filter(Boolean)))]
    const relatedAssignments = complex ? rows.flatMap((row) => row.effectiveOwner?.length ? [{ ...row.effectiveOwner[0], sessionId: row._id }] : []) : isAdmin(req.user) && teacherIds.length ? await Assignment.find({ team, teacherId: { $in: teacherIds }, startsAt: { $lt: range.to }, $or: [{ endsAt: null }, { endsAt: { $gt: range.from } }] }).select('teacherId supervisorId startsAt endsAt primary').lean() : assignments
    const supervisorIds = [...new Set(relatedAssignments.map((row) => id(row.supervisorId)))]
    const [reports, actions, supervisors, shifts, dispatch, academicReports, academicSettings] = await Promise.all([
      sessionIds.length ? QuranSessionReport.find({ sessionId: { $in: sessionIds } }).select('sessionId status submittedAt').lean() : [],
      sessionIds.length ? Action.find({ sessionId: { $in: sessionIds }, team, status: 'open' }).select('sessionId category description ownerId createdAt').populate('ownerId', 'firstNameAr lastNameAr').lean() : [],
      supervisorIds.length ? User.find({ _id: { $in: supervisorIds } }).select('firstNameAr lastNameAr isActive').lean() : [],
      supervisorIds.length ? Shift.find({ team, members: { $in: supervisorIds }, cancelledAt: null, startsAt: { $lt: range.to }, endsAt: { $gt: range.from } }).select('members startsAt endsAt').lean() : [],
      team === 'academic' ? Dispatch.findOne({ dayStart: range.from, dayEnd: range.to }).sort({ createdAt: -1 }).select('createdAt sentBy sessionCount').lean() : null,
      team === 'academic' && sessionIds.length ? AcademicReport.find({ sessionId: { $in: sessionIds } }).select('sessionId supervisorId status observation dueAt submittedAt reviewedAt teacherReplyStatus').lean() : [],
      team === 'academic' ? Settings.findOne({ team: 'academic' }).select('reportGraceMinutes').lean() : null,
    ])
    const reportBySession = new Map(reports.map((row) => [id(row.sessionId), row]))
    const actionsBySession = new Map()
    for (const action of actions) actionsBySession.set(id(action.sessionId), [...(actionsBySession.get(id(action.sessionId)) || []), action])
    const personById = new Map(supervisors.map((row) => [id(row), row]))
    const academicBySession = new Map()
    for (const report of academicReports) academicBySession.set(id(report.sessionId), [...(academicBySession.get(id(report.sessionId)) || []), report])
    const data = rows.map((row) => {
      const at = row.scheduledAt
      const owners = relatedAssignments.filter((assignment) => complex ? id(assignment.sessionId) === id(row) : [id(row.teacherId), id(row.supervisionOriginalTeacherId)].includes(id(assignment.teacherId)) && activeAt(assignment, at)).map((assignment) => {
        const person = personById.get(id(assignment.supervisorId))
        return person ? { ...person, primary: assignment.primary, onShift: shifts.some((shift) => shift.startsAt <= at && shift.endsAt > at && shift.members.some((member) => id(member) === id(person))) } : null
      }).filter(Boolean)
      const report = reportBySession.get(id(row))
      const academicFollowups = team === 'academic' ? [...new Map(owners.map((owner) => [id(owner), owner])).values()].map((owner) => {
        const existing = (academicBySession.get(id(row)) || []).find((item) => id(item.supervisorId) === id(owner))
        const shift = shifts.filter((item) => item.startsAt <= at && item.endsAt > at && item.members.some((member) => id(member) === id(owner)))
          .sort((a, b) => a.endsAt - b.endsAt)[0]
        const dueAt = existing?.dueAt || (shift ? new Date(shift.endsAt.getTime() + (academicSettings?.reportGraceMinutes ?? 120) * 60000) : null)
        return { supervisorId: id(owner), supervisorName: `${owner.firstNameAr || ''} ${owner.lastNameAr || ''}`.trim(),
          reportId: existing?._id || null, status: existing?.status || (shift ? 'missing' : 'no_shift'), observation: existing?.observation || null,
          dueAt, overdue: !!dueAt && ['completed', 'missed', 'no_show'].includes(row.status) && new Date() > dueAt && !['submitted', 'reviewed'].includes(existing?.status),
          teacherReplyStatus: existing?.teacherReplyStatus || null }
      }) : []
      return { ...row, supervisors: owners, reportStatus: report?.status || null,
        academicFollowups,
        missingTeacherReport: row.status === 'completed' && row.quranReportRequired !== false && !['submitted', 'approved'].includes(report?.status),
        openActions: actionsBySession.get(id(row)) || [] }
    })
    res.status(200).json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total, dispatch })
  } catch (error) { next(error) }
}

exports.dispatch = async (req, res, next) => {
  try {
    const range = period(req, res); if (!range) return
    if (isAdmin(req.user) ? !req.user.hasPermission('supervision.manage') : req.user.supervisionTeam !== 'administrative') return sendError(res, 'التسليم من مسؤول الإشراف الإداري فقط', 403)
    const complex = await Assignment.exists({ scopeType: { $in: ['student', 'cohort'] }, startsAt: { $lt: range.to }, $or: [{ endsAt: null }, { endsAt: { $gt: range.from } }] })
    let sessionCount = 0
    const recipientIds = new Set()
    if (complex) {
      const pipeline = [
        { $match: { scheduledAt: { $gte: range.from, $lt: range.to }, status: { $nin: ['cancelled', 'rescheduled'] } } },
        ...coverage.ownershipStages('administrative'),
        { $match: isAdmin(req.user) || isManager(req.user) ? { 'effectiveOwner.0': { $exists: true } } : { 'effectiveOwner.0.supervisorId': req.user._id } },
        ...coverage.ownershipStages('academic'),
        { $group: { _id: null, count: { $sum: 1 }, recipients: { $addToSet: { $arrayElemAt: ['$effectiveOwner.supervisorId', 0] } } } },
      ]
      const [summary] = await Session.aggregate(pipeline).allowDiskUse(true)
      sessionCount = summary?.count || 0
      for (const person of summary?.recipients || []) if (person) recipientIds.add(id(person))
    } else {
      const adminAssignments = await assignmentsFor('administrative', range.from, range.to, req.user)
      const filter = sessionFilter(range.from, range.to, adminAssignments, req.user)
      const [count, currentTeacherIds, originalTeacherIds] = await Promise.all([
        Session.countDocuments(filter), Session.distinct('teacherId', filter), Session.distinct('supervisionOriginalTeacherId', filter),
      ])
      sessionCount = count
      const teacherIds = [...new Set([...currentTeacherIds, ...originalTeacherIds].filter(Boolean).map(id))]
      const academicAssignments = teacherIds.length ? await Assignment.find({ team: 'academic', teacherId: { $in: teacherIds }, startsAt: { $lt: range.to }, $or: [{ endsAt: null }, { endsAt: { $gt: range.from } }] }).select('teacherId supervisorId startsAt endsAt').lean() : []
      const byTeacher = new Map()
      for (const assignment of academicAssignments) byTeacher.set(id(assignment.teacherId), [...(byTeacher.get(id(assignment.teacherId)) || []), assignment])
      const cursor = Session.find(filter).select('teacherId supervisionOriginalTeacherId scheduledAt').lean().cursor({ batchSize: 250 })
      for await (const session of cursor) {
        for (const teacherId of [id(session.teacherId), id(session.supervisionOriginalTeacherId)].filter(Boolean)) {
          for (const row of byTeacher.get(teacherId) || []) if (activeAt(row, session.scheduledAt)) recipientIds.add(id(row.supervisorId))
        }
      }
    }
    if (!sessionCount) return sendError(res, 'لا توجد حلقات لتسليمها في هذه الفترة', 409)
    if (sessionCount && !recipientIds.size) return sendError(res, 'لا يوجد مشرف أكاديمي مكلف بهذه الحلقات', 409)
    const supervisors = recipientIds.size ? await User.find({ _id: { $in: [...recipientIds] }, isActive: true, supervisionTeam: 'academic', supervisionPosition: 'supervisor' }).select('_id supervisionPosition').lean() : []
    if (sessionCount && !supervisors.length) return sendError(res, 'المشرفون الأكاديميون المكلفون غير نشطين', 409)
    const managers = await User.find({ isActive: true, supervisionTeam: 'academic', supervisionPosition: 'manager' }).select('_id supervisionPosition').lean()
    const recipients = [...supervisors, ...managers]
    const row = await Dispatch.create({ dayStart: range.from, dayEnd: range.to, sentBy: req.user._id, recipientIds: recipients.map((person) => person._id), sessionCount })
    await createNotifications(recipients.map((person) => ({
      userId: person._id, type: 'schedule', titleAr: 'جدول الحلقات جاهز للمتابعة',
      bodyAr: `سلّم الإشراف الإداري جدول ${sessionCount} حصة. افتح قائمة الحلقات الحية لمراجعة تكليفاتك.`,
      actionUrl: person.supervisionPosition === 'manager' ? '/admin/supervision/academic-manager' : '/admin/supervision/academic', metadata: { dedupeKey: `day-dispatch:${row._id}` },
    })))
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_day_dispatch', entity: 'SupervisionDayDispatch', entityId: row._id, changes: { team: 'administrative', recipients: recipients.map((person) => person._id), sessionCount }, ip: req.ip })
    sendSuccess(res, row, 'تم تسليم قائمة الحلقات للأكاديمي', 201)
  } catch (error) { next(error) }
}

exports.createAction = async (req, res, next) => {
  try {
    const team = teamFor(req, res); if (!team) return
    const { sessionId, category, description, ownerId } = req.body || {}
    if (!mongoose.isValidObjectId(sessionId) || !['readiness', 'entry', 'link', 'message', 'teacher_report'].includes(category) || typeof description !== 'string' || !description.trim() || description.length > 1000 || !mongoose.isValidObjectId(ownerId)) return sendError(res, 'بيانات المتابعة غير صالحة', 400)
    const session = await Session.findById(sessionId).select('teacherId supervisionOriginalTeacherId studentId scheduledAt status').lean()
    if (!session || ['cancelled', 'rescheduled'].includes(session.status)) return sendError(res, 'الحصة غير متاحة', 404)
    if (!await canAccessSession(req.user, team, session)) return sendError(res, 'غير مصرح لهذه الحصة', 403)
    const owner = await User.findOne({ _id: ownerId, isActive: true, supervisionTeam: team }).select('_id supervisionTeam supervisionPosition').lean()
    if (!owner || !['manager', 'supervisor'].includes(owner.supervisionPosition)) return sendError(res, 'المسؤول غير صالح', 400)
    if (owner.supervisionPosition === 'supervisor' && !await canAccessSession({ ...owner, hasPermission: () => false }, team, session)) return sendError(res, 'المشرف غير مكلف بهذه الحصة', 400)
    const row = await Action.create({ sessionId, team, category, description: description.trim(), ownerId, createdBy: req.user._id })
    await createNotification({ userId: ownerId, type: 'assignment', titleAr: 'متابعة جديدة لحصة', bodyAr: row.description, actionUrl: `/admin/supervision/${team}${owner.supervisionPosition === 'manager' ? '-manager' : ''}`, metadata: { dedupeKey: `daily-action:${row._id}` } }).catch((error) => console.error('[supervision] daily action notification error:', error))
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_daily_action_create', entity: 'SupervisionDailyAction', entityId: row._id, changes: { team, sessionId, category, ownerId }, ip: req.ip })
    sendSuccess(res, row, 'تم تسجيل المتابعة', 201)
  } catch (error) { next(error) }
}

exports.updateReadiness = async (req, res, next) => {
  try {
    if (isAdmin(req.user) ? !req.user.hasPermission('supervision.manage') : req.user.supervisionTeam !== 'administrative') return sendError(res, 'الجاهزية يتابعها الإشراف الإداري', 403)
    if (!mongoose.isValidObjectId(req.params.sessionId) || !['student', 'teacher', 'link'].includes(req.body?.aspect) || !['unknown', 'ready', 'issue'].includes(req.body?.state)) return sendError(res, 'بيانات الجاهزية غير صالحة', 400)
    const session = await Session.findById(req.params.sessionId).select('teacherId supervisionOriginalTeacherId studentId scheduledAt status meetingLink').lean()
    if (!session || !['scheduled', 'ongoing'].includes(session.status)) return sendError(res, 'فحص الجاهزية متاح قبل الحصة وأثناءها فقط', 409)
    if (!await canAccessSession(req.user, 'administrative', session)) return sendError(res, 'غير مصرح لهذه الحصة', 403)
    if (req.body.aspect === 'link' && req.body.state === 'ready' && !session.meetingLink) return sendError(res, 'أضف رابط الحصة قبل تأكيد جاهزيته', 409)
    const updated = await Session.findOneAndUpdate({ _id: session._id, status: { $in: ['scheduled', 'ongoing'] } }, {
      $set: { [`administrativeReadiness.${req.body.aspect}`]: req.body.state, 'administrativeReadiness.updatedAt': new Date(), 'administrativeReadiness.updatedBy': req.user._id },
    }, { new: true, runValidators: true }).select('administrativeReadiness')
    if (!updated) return sendError(res, 'تغيرت حالة الحصة؛ حدّث القائمة', 409)
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_readiness_update', entity: 'Session', entityId: session._id, changes: { team: 'administrative', aspect: req.body.aspect, state: req.body.state }, ip: req.ip })
    sendSuccess(res, updated.administrativeReadiness, 'تم تحديث الجاهزية')
  } catch (error) { next(error) }
}

exports.resolveAction = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || typeof req.body?.resolution !== 'string' || !req.body.resolution.trim() || req.body.resolution.length > 1000) return sendError(res, 'اكتب نتيجة المتابعة', 400)
    const action = await Action.findById(req.params.id)
    if (!action) return sendError(res, 'المتابعة غير موجودة', 404)
    if (!isAdmin(req.user) && (req.user.supervisionTeam !== action.team || !isManager(req.user) && id(action.ownerId) !== id(req.user))) return sendError(res, 'غير مصرح', 403)
    if (action.status === 'resolved') return sendError(res, 'المتابعة مغلقة بالفعل', 409)
    action.status = 'resolved'; action.resolution = req.body.resolution.trim(); action.resolvedBy = req.user._id; action.resolvedAt = new Date()
    await action.save()
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_daily_action_resolve', entity: 'SupervisionDailyAction', entityId: action._id, changes: { team: action.team, resolution: action.resolution }, ip: req.ip })
    sendSuccess(res, action, 'تم إغلاق المتابعة')
  } catch (error) { next(error) }
}

exports.remindTeacherReport = async (req, res, next) => {
  try {
    const team = teamFor(req, res); if (!team) return
    if (!mongoose.isValidObjectId(req.params.sessionId)) return sendError(res, 'الحصة غير صالحة', 400)
    const session = await Session.findById(req.params.sessionId).select('teacherId supervisionOriginalTeacherId studentId scheduledAt status quranReportRequired').lean()
    if (!session || session.status !== 'completed' || session.quranReportRequired === false) return sendError(res, 'لا يوجد تقرير مستحق لهذه الحصة', 404)
    if (!await canAccessSession(req.user, team, session)) return sendError(res, 'غير مصرح لهذه الحصة', 403)
    const report = await QuranSessionReport.findOne({ sessionId: session._id }).select('status').lean()
    if (['submitted', 'approved'].includes(report?.status)) return sendError(res, 'تقرير المعلم وصل بالفعل', 409)
    const notification = await createNotification({ userId: session.teacherId, type: 'report', titleAr: 'تقرير الحصة لم يُرسل بعد', bodyAr: 'يرجى إرسال تقرير الحصة المنتهية حتى يظهر للطالب والإشراف.', actionUrl: `/teacher/quran-reports/${session._id}`, metadata: { dedupeKey: `teacher-report-followup:${session._id}:${new Date().toISOString().slice(0, 13)}` } })
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_teacher_report_followup', entity: 'Session', entityId: session._id, changes: { team, sent: !!notification }, ip: req.ip })
    sendSuccess(res, { sent: !!notification }, notification ? 'تم تنبيه المعلم' : 'أُرسل تنبيه بالفعل خلال هذه الساعة')
  } catch (error) { next(error) }
}

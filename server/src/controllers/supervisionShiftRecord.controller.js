const mongoose = require('mongoose')
const Shift = require('../models/SupervisionShift')
const Record = require('../models/SupervisionShiftRecord')
const Assignment = require('../models/SupervisionAssignment')
const Session = require('../models/Session')
const Exception = require('../models/SupervisionException')
const Action = require('../models/SupervisionDailyAction')
const Adjustment = require('../models/SupervisionAdjustmentRequest')
const Payroll = require('../models/TeacherPayrollEntry')
const LessonTransaction = require('../models/LessonTransaction')
const Settings = require('../models/SupervisionSettings')
const User = require('../models/User')
const AcademicReport = require('../models/AcademicObservationReport')
const { sendError, sendSuccess } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createNotifications } = require('../services/notification.service')
const { ownershipStages } = require('../services/supervisionCoverage.service')

const id = (value) => String(value?._id || value || '')
const isAdmin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.view')
const isManager = (user) => user.supervisionPosition === 'manager'
const isMember = (shift, userId) => shift.members.some((member) => id(member) === id(userId))
const text = (value, max) => typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : null

function canRead(user, shift, memberId) {
  if (isAdmin(user)) return true
  if (user.supervisionTeam !== shift.team) return false
  return isManager(user) || id(user) === id(memberId)
}

async function getShift(req, res) {
  if (!mongoose.isValidObjectId(req.params.shiftId)) { sendError(res, 'الشيفت غير صالح', 400); return null }
  const shift = await Shift.findById(req.params.shiftId).lean()
  if (!shift || shift.cancelledAt) { sendError(res, 'الشيفت غير موجود أو ملغي', 404); return null }
  return shift
}

function reportState(shift, record, graceMinutes, now = new Date()) {
  const dueAt = record?.reportDueAt || new Date(shift.endsAt.getTime() + graceMinutes * 60000)
  return { dueAt, handoff: record?.handedOffAt ? record.handedOffAt > shift.endsAt ? 'late' : 'submitted' : now >= shift.endsAt ? 'missing' : 'pending',
    report: record?.reportSubmittedAt ? record.reportSubmittedAt <= dueAt ? 'on_time' : 'late' : now > dueAt ? 'late_missing' : now >= shift.endsAt ? 'within_grace' : 'pending' }
}

async function dueAtFor(shift) {
  const setting = await Settings.findOne({ team: shift.team }).select('reportGraceMinutes').lean()
  return new Date(shift.endsAt.getTime() + (setting?.reportGraceMinutes ?? 120) * 60000)
}

async function assignmentsFor(shift, memberId, position) {
  const filter = { team: shift.team, startsAt: { $lt: shift.endsAt }, $or: [{ endsAt: null }, { endsAt: { $gt: shift.startsAt } }] }
  if (position !== 'manager') filter.supervisorId = memberId
  return Assignment.find(filter).select('teacherId startsAt endsAt').lean()
}

function sessionFilter(shift, assignments) {
  const intervals = assignments.flatMap((row) => ['teacherId', 'supervisionOriginalTeacherId'].map((field) => ({
    [field]: row.teacherId,
    scheduledAt: { $gte: new Date(Math.max(shift.startsAt, row.startsAt)), $lt: new Date(Math.min(shift.endsAt, row.endsAt || shift.endsAt)) },
  })))
  return { scheduledAt: { $gte: shift.startsAt, $lt: shift.endsAt }, ...(intervals.length ? { $or: intervals } : { _id: { $in: [] } }) }
}

function exceptionFilter(shift, assignments, types) {
  const intervals = assignments.flatMap((row) => ['originalTeacherId', 'currentTeacherId'].map((field) => ({
    [field]: row.teacherId,
    sessionScheduledAt: { $gte: new Date(Math.max(shift.startsAt, row.startsAt)), $lt: new Date(Math.min(shift.endsAt, row.endsAt || shift.endsAt)) },
  })))
  return { type: { $in: types }, sessionScheduledAt: { $gte: shift.startsAt, $lt: shift.endsAt },
    ...(intervals.length ? { $or: intervals } : { _id: { $in: [] } }) }
}

async function snapshot(shift, memberId, position) {
  const complex = await Assignment.exists({ team: shift.team, scopeType: { $in: ['student', 'cohort'] },
    startsAt: { $lt: shift.endsAt }, $or: [{ endsAt: null }, { endsAt: { $gt: shift.startsAt } }] })
  let filter, apologyFilter, absenceFilter
  if (complex) {
    const owner = position === 'manager' ? { 'effectiveOwner.0': { $exists: true } }
      : { 'effectiveOwner.0.supervisorId': new mongoose.Types.ObjectId(memberId) }
    const covered = await Session.aggregate([
      { $match: { scheduledAt: { $gte: shift.startsAt, $lt: shift.endsAt } } },
      ...ownershipStages(shift.team), { $match: owner }, { $project: { _id: 1 } },
    ])
    const sessionIds = covered.map((row) => row._id)
    filter = { _id: { $in: sessionIds } }
    apologyFilter = { sessionId: { $in: sessionIds }, type: { $in: ['student_apology', 'teacher_apology'] } }
    absenceFilter = { sessionId: { $in: sessionIds }, type: { $in: ['student_absence', 'teacher_absence'] } }
  } else {
    const assignments = await assignmentsFor(shift, memberId, position)
    filter = sessionFilter(shift, assignments)
    apologyFilter = exceptionFilter(shift, assignments, ['student_apology', 'teacher_apology'])
    absenceFilter = exceptionFilter(shift, assignments, ['student_absence', 'teacher_absence'])
  }
  const [groups, lessons, apologyCount, absenceCount, apologies, absences, observedResult] = await Promise.all([
    Session.aggregate([{ $match: filter },
      { $lookup: { from: 'attendances', localField: '_id', foreignField: 'sessionId', as: 'attendance' } },
      { $set: { studentAttendance: { $arrayElemAt: ['$attendance.status', 0] } } },
      { $group: { _id: '$status', count: { $sum: 1 },
        studentPresent: { $sum: { $cond: [{ $in: ['$studentAttendance', ['present', 'late', 'left_early']] }, 1, 0] } },
        studentAbsent: { $sum: { $cond: [{ $eq: ['$studentAttendance', 'absent'] }, 1, 0] } },
        teacherStarted: { $sum: { $cond: [{ $ne: ['$teacherStartedAt', null] }, 1, 0] } },
      } },
    ]),
    Session.find({ ...filter, status: 'completed' }).sort({ scheduledAt: 1, _id: 1 }).limit(50)
      .select('scheduledAt teacherId studentId titleAr').populate('teacherId', 'firstNameAr lastNameAr').populate('studentId', 'firstNameAr lastNameAr').lean(),
    Exception.countDocuments(apologyFilter),
    Exception.countDocuments(absenceFilter),
    Exception.find(apologyFilter).sort({ sessionScheduledAt: 1 }).limit(30).select('sessionId type reason').lean(),
    Exception.find(absenceFilter).sort({ sessionScheduledAt: 1 }).limit(30).select('sessionId type reason').lean(),
    shift.team === 'academic' ? Session.aggregate([
      { $match: filter },
      { $lookup: { from: AcademicReport.collection.name, let: { sessionId: '$_id' }, pipeline: [
        { $match: { observation: 'observed', ...(position === 'manager' ? {} : { supervisorId: new mongoose.Types.ObjectId(memberId) }),
          $expr: { $eq: ['$sessionId', '$$sessionId'] } } },
        { $project: { status: 1, rating: 1, observedAt: 1, submittedAt: 1 } },
      ], as: 'observations' } },
      { $match: { 'observations.0': { $exists: true } } },
      { $project: { scheduledAt: 1, teacherId: 1, studentId: 1, submitted: { $anyElementTrue: { $map: { input: '$observations', as: 'report', in: { $ne: [{ $ifNull: ['$$report.submittedAt', null] }, null] } } } },
        rated: { $anyElementTrue: { $map: { input: '$observations', as: 'report', in: { $ne: [{ $ifNull: ['$$report.rating', null] }, null] } } } } } },
      { $facet: { counts: [{ $group: { _id: null, observed: { $sum: 1 }, submitted: { $sum: { $cond: ['$submitted', 1, 0] } }, rated: { $sum: { $cond: ['$rated', 1, 0] } } } }],
        rows: [{ $sort: { scheduledAt: 1, _id: 1 } }, { $limit: 50 }] } },
    ]) : [{ counts: [], rows: [] }],
  ])
  const counts = Object.fromEntries(groups.map((row) => [row._id, row.count]))
  const observed = observedResult[0] || { counts: [], rows: [] }
  const observedCounts = observed.counts[0] || { observed: 0, submitted: 0, rated: 0 }
  const observedPeopleIds = [...new Set(observed.rows.flatMap((row) => [id(row.teacherId), id(row.studentId)]))]
  const observedPeople = observedPeopleIds.length ? await User.find({ _id: { $in: observedPeopleIds } }).select('firstNameAr lastNameAr').lean() : []
  const observedPeopleById = new Map(observedPeople.map((row) => [id(row), row]))
  return { calculatedAt: new Date(), source: 'Session/SupervisionException', total: groups.filter((row) => row._id !== 'rescheduled').reduce((sum, row) => sum + row.count, 0),
    completed: counts.completed || 0, cancelled: counts.cancelled || 0, noShow: (counts.no_show || 0) + (counts.missed || 0),
    ongoing: counts.ongoing || 0, scheduled: counts.scheduled || 0, apologies: apologyCount, absences: absenceCount,
    studentPresent: groups.reduce((sum, row) => sum + (row.studentPresent || 0), 0),
    studentAbsent: groups.reduce((sum, row) => sum + (row.studentAbsent || 0), 0),
    teacherStarted: groups.reduce((sum, row) => sum + (row.teacherStarted || 0), 0),
    completedLessons: lessons.map((row) => ({ sessionId: row._id, scheduledAt: row.scheduledAt, teacher: row.teacherId, student: row.studentId })),
    completedLessonsTruncated: (counts.completed || 0) > lessons.length,
    apologyCases: apologies, apologyCasesTruncated: apologyCount > apologies.length,
    absenceCases: absences, absenceCasesTruncated: absenceCount > absences.length,
    observedLessons: shift.team === 'academic' ? observedCounts.observed : null,
    observedReportsSubmitted: shift.team === 'academic' ? observedCounts.submitted : null,
    observedEvaluations: shift.team === 'academic' ? observedCounts.rated : null,
    observedLessonRows: observed.rows.map((row) => ({ sessionId: row._id, scheduledAt: row.scheduledAt,
      teacher: observedPeopleById.get(id(row.teacherId)), student: observedPeopleById.get(id(row.studentId)),
      reportSubmitted: row.submitted, evaluated: row.rated })),
    observedLessonsTruncated: observedCounts.observed > observed.rows.length }
}

async function liveQueue(team, memberId) {
  const [cases, actions, caseCount, actionCount] = await Promise.all([
    Exception.find({ ownerId: memberId, status: 'open' }).sort({ followUpAt: 1, _id: 1 }).limit(30)
      .select('sessionId type reason followUpAt ownerId status').lean(),
    Action.find({ team, ownerId: memberId, status: 'open' }).sort({ createdAt: 1 }).limit(30)
      .select('sessionId category description ownerId status createdAt').lean(),
    Exception.countDocuments({ ownerId: memberId, status: 'open' }),
    Action.countDocuments({ team, ownerId: memberId, status: 'open' }),
  ])
  return { cases, actions, caseCount, actionCount, truncated: caseCount > cases.length || actionCount > actions.length }
}

async function financeFor(shift, user) {
  if (shift.team !== 'administrative' || !(user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('payroll.view') || isManager(user) && user.supervisionTeam === 'administrative')) return null
  const range = { $gte: shift.startsAt, $lt: shift.endsAt }
  const [payroll, lessons, pendingAdjustments] = await Promise.all([
    Payroll.aggregate([{ $match: { createdAt: range, voided: false } }, { $group: { _id: '$currency', amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    LessonTransaction.aggregate([{ $match: { createdAt: range } }, { $group: { _id: '$type', amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Adjustment.countDocuments({ status: { $in: ['pending', 'processing'] }, createdAt: { $lt: shift.endsAt } }),
  ])
  return { payroll, lessons, pendingAdjustments, source: 'TeacherPayrollEntry/LessonTransaction' }
}

exports.list = async (req, res, next) => {
  try {
    const team = req.query.team || req.user.supervisionTeam
    if (!['academic', 'administrative'].includes(team) || !isAdmin(req.user) && req.user.supervisionTeam !== team) return sendError(res, 'غير مصرح', 403)
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))
    const filter = { team, cancelledAt: null }
    if (!isAdmin(req.user) && !isManager(req.user)) filter.members = req.user._id
    const [shifts, total, setting] = await Promise.all([
      Shift.find(filter).sort({ startsAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('members', 'firstNameAr lastNameAr supervisionPosition').lean(),
      Shift.countDocuments(filter), Settings.findOne({ team }).select('reportGraceMinutes').lean(),
    ])
    const records = await Record.find({ shiftId: { $in: shifts.map((row) => row._id) } }).select('-reportSnapshot').lean()
    const byShift = new Map()
    for (const row of records) byShift.set(id(row.shiftId), [...(byShift.get(id(row.shiftId)) || []), row])
    const data = shifts.map((shift) => ({ ...shift, records: shift.members.map((member) => {
      const record = (byShift.get(id(shift)) || []).find((row) => id(row.memberId) === id(member))
      return { member, record: record || null, ...reportState(shift, record, setting?.reportGraceMinutes ?? 120) }
    }) }))
    res.status(200).json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) { next(error) }
}

exports.handoffFeed = async (req, res, next) => {
  try {
    const team = req.query.team || req.user.supervisionTeam
    if (!['academic', 'administrative'].includes(team) || !isAdmin(req.user) && req.user.supervisionTeam !== team) return sendError(res, 'غير مصرح', 403)
    const rows = await Record.find({ team, handedOffAt: { $gte: new Date(Date.now() - 48 * 3600000) } })
      .sort({ handedOffAt: -1, _id: -1 }).limit(20).select('shiftId memberId handedOffAt handoffNote')
      .populate('shiftId', 'name startsAt endsAt cancelledAt').populate('memberId', 'firstNameAr lastNameAr').lean()
    const active = rows.filter((row) => row.shiftId && !row.shiftId.cancelledAt)
    const ownerIds = active.map((row) => row.memberId?._id).filter(Boolean)
    const [cases, actions] = await Promise.all([
      Exception.find({ ownerId: { $in: ownerIds }, status: 'open' }).sort({ followUpAt: 1 }).limit(100)
        .select('ownerId type reason followUpAt').lean(),
      Action.find({ team, ownerId: { $in: ownerIds }, status: 'open' }).sort({ createdAt: 1 }).limit(100)
        .select('ownerId category description').lean(),
    ])
    sendSuccess(res, active.map((row) => ({ ...row,
      openCases: cases.filter((item) => id(item.ownerId) === id(row.memberId)).slice(0, 10),
      openActions: actions.filter((item) => id(item.ownerId) === id(row.memberId)).slice(0, 10),
      queueTruncated: cases.length === 100 || actions.length === 100,
    })))
  } catch (error) { next(error) }
}

exports.detail = async (req, res, next) => {
  try {
    const shift = await getShift(req, res); if (!shift) return
    const memberId = req.query.memberId || req.user._id
    if (!mongoose.isValidObjectId(memberId) || !isMember(shift, memberId) || !canRead(req.user, shift, memberId)) return sendError(res, 'غير مصرح لهذا العضو', 403)
    const [member, record, setting, queue, finance] = await Promise.all([
      User.findById(memberId).select('firstNameAr lastNameAr supervisionPosition').lean(),
      Record.findOne({ shiftId: shift._id, memberId }).lean(), Settings.findOne({ team: shift.team }).select('reportGraceMinutes').lean(),
      liveQueue(shift.team, memberId), financeFor(shift, req.user),
    ])
    const liveReport = await snapshot(shift, memberId, member?.supervisionPosition)
    sendSuccess(res, { shift, member, record, ...reportState(shift, record, setting?.reportGraceMinutes ?? 120), liveReport, queue, finance })
  } catch (error) { next(error) }
}

exports.checkIn = async (req, res, next) => {
  try {
    const shift = await getShift(req, res); if (!shift) return
    const now = new Date()
    if (!isMember(shift, req.user._id) || now < new Date(shift.startsAt.getTime() - 30 * 60000) || now > shift.endsAt) return sendError(res, 'تسجيل الحضور متاح لعضو الشيفت من 30 دقيقة قبل بدايته وحتى نهايته', 403)
    const reportDueAt = await dueAtFor(shift)
    let record
    try {
      record = await Record.findOneAndUpdate({ shiftId: shift._id, memberId: req.user._id, checkedInAt: { $exists: false } },
        { $set: { checkedInAt: now }, $setOnInsert: { team: shift.team, reportDueAt } }, { new: true, upsert: true, setDefaultsOnInsert: true })
    } catch (error) {
      if (error.code !== 11000) throw error
      record = await Record.findOne({ shiftId: shift._id, memberId: req.user._id })
    }
    sendSuccess(res, record, 'تم تسجيل بداية الشيفت')
  } catch (error) { next(error) }
}

exports.checkOut = async (req, res, next) => {
  try {
    const shift = await getShift(req, res); if (!shift) return
    if (!isMember(shift, req.user._id) || new Date() < shift.startsAt) return sendError(res, 'غير مصرح', 403)
    const record = await Record.findOneAndUpdate({ shiftId: shift._id, memberId: req.user._id, checkedInAt: { $exists: true }, checkedOutAt: { $exists: false } },
      { $set: { checkedOutAt: new Date() } }, { new: true })
    if (!record) return sendError(res, 'سجل الحضور أولًا أو انتهى الشيفت بالفعل', 409)
    sendSuccess(res, record, 'تم تسجيل نهاية الشيفت')
  } catch (error) { next(error) }
}

exports.handoff = async (req, res, next) => {
  try {
    const shift = await getShift(req, res); if (!shift) return
    const note = text(req.body?.note, 2000)
    if (!note) return sendError(res, 'اكتب ملخصًا قصيرًا للتسليم', 400)
    if (!isMember(shift, req.user._id) || new Date() < new Date(shift.endsAt.getTime() - 30 * 60000)) return sendError(res, 'التسليم متاح لعضو الشيفت في آخر 30 دقيقة أو بعدها', 403)
    const reportDueAt = await dueAtFor(shift)
    let record
    try {
      record = await Record.findOneAndUpdate({ shiftId: shift._id, memberId: req.user._id, handedOffAt: { $exists: false } },
        { $set: { handedOffAt: new Date(), handoffNote: note }, $setOnInsert: { team: shift.team, reportDueAt } },
        { new: true, upsert: true, setDefaultsOnInsert: true })
    } catch (error) {
      if (error.code === 11000) return sendError(res, 'تم التسليم بالفعل', 409)
      throw error
    }
    if (!record) return sendError(res, 'تم التسليم بالفعل', 409)
    const [nextShifts, managers] = await Promise.all([
      Shift.find({ team: shift.team, cancelledAt: null, startsAt: { $gte: shift.startsAt, $lt: new Date(shift.endsAt.getTime() + 24 * 3600000) }, _id: { $ne: shift._id } }).sort({ startsAt: 1 }).limit(20).select('members').lean(),
      User.find({ supervisionTeam: shift.team, supervisionPosition: 'manager', isActive: true }).select('_id').lean(),
    ])
    const recipientIds = [...new Set([...nextShifts.flatMap((row) => row.members.map(id)), ...managers.map(id)])].filter((value) => value !== id(req.user._id))
    await createNotifications(recipientIds.map((userId) => ({ userId, type: 'assignment', titleAr: 'تسليم شيفت جديد',
      bodyAr: 'راجع الحالات المفتوحة والمحضر في لوحة تسليم الشيفت.', actionUrl: `/admin/supervision/${shift.team}`,
      metadata: { dedupeKey: `shift-handoff:${record._id}` } }))).catch((error) => console.error('[supervision] handoff notification:', error))
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_shift_handoff', entity: 'SupervisionShiftRecord', entityId: record._id, changes: { shiftId: shift._id, team: shift.team }, ip: req.ip })
    sendSuccess(res, record, 'تم تسليم الشيفت والحالات المفتوحة ظاهرة من السجل الحي')
  } catch (error) { next(error) }
}

exports.saveReportDraft = async (req, res, next) => {
  try {
    const shift = await getShift(req, res); if (!shift) return
    const analysis = text(req.body?.analysis, 4000)
    if (!analysis || !isMember(shift, req.user._id) || new Date() < shift.startsAt) return sendError(res, 'مسودة التقرير متاحة لصاحب الشيفت بعد بدايته', 403)
    const reportDueAt = await dueAtFor(shift)
    let record
    try {
      record = await Record.findOneAndUpdate({ shiftId: shift._id, memberId: req.user._id, reportSubmittedAt: { $exists: false } },
        { $set: { analysis }, $setOnInsert: { team: shift.team, reportDueAt } },
        { new: true, upsert: true, setDefaultsOnInsert: true })
    } catch (error) {
      if (error.code === 11000) return sendError(res, 'أُرسل التقرير بالفعل', 409)
      throw error
    }
    if (!record) return sendError(res, 'أُرسل التقرير بالفعل', 409)
    sendSuccess(res, { analysis: record.analysis, updatedAt: record.updatedAt }, 'حُفظت المسودة')
  } catch (error) { next(error) }
}

exports.submitReport = async (req, res, next) => {
  try {
    const shift = await getShift(req, res); if (!shift) return
    const analysis = text(req.body?.analysis, 4000)
    if (!analysis) return sendError(res, 'اكتب خلاصة الشيفت', 400)
    if (!isMember(shift, req.user._id) || new Date() < shift.endsAt) return sendError(res, 'التقرير يُرسل بعد نهاية الشيفت', 403)
    const member = await User.findById(req.user._id).select('supervisionPosition').lean()
    const reportSnapshot = await snapshot(shift, req.user._id, member?.supervisionPosition)
    const queueAtSubmission = await liveQueue(shift.team, req.user._id)
    reportSnapshot.handoffOpen = { caseCount: queueAtSubmission.caseCount, actionCount: queueAtSubmission.actionCount,
      caseIds: queueAtSubmission.cases.map((row) => row._id), actionIds: queueAtSubmission.actions.map((row) => row._id),
      truncated: queueAtSubmission.truncated }
    const reportDueAt = await dueAtFor(shift)
    let record
    try {
      record = await Record.findOneAndUpdate({ shiftId: shift._id, memberId: req.user._id, reportSubmittedAt: { $exists: false } },
        { $set: { analysis, reportSnapshot, reportSubmittedAt: new Date() }, $setOnInsert: { team: shift.team, reportDueAt } },
        { new: true, upsert: true, setDefaultsOnInsert: true })
    } catch (error) {
      if (error.code === 11000) return sendError(res, 'تم إرسال التقرير بالفعل', 409)
      throw error
    }
    if (!record) return sendError(res, 'تم إرسال التقرير بالفعل', 409)
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'supervision_shift_report_submit', entity: 'SupervisionShiftRecord', entityId: record._id, changes: { shiftId: shift._id, team: shift.team }, ip: req.ip })
    sendSuccess(res, record, 'تم إرسال تقرير نهاية الشيفت')
  } catch (error) { next(error) }
}

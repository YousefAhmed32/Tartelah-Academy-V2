const crypto = require('crypto')
const mongoose = require('mongoose')
const { fromZonedTime } = require('date-fns-tz')
const Session = require('../models/Session')
const { ownershipStages } = require('./supervisionCoverage.service')
const Attendance = require('../models/Attendance')
const Observation = require('../models/AcademicObservationReport')
const Exception = require('../models/SupervisionException')
const Shift = require('../models/SupervisionShift')
const User = require('../models/User')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const Evaluation = require('../models/Evaluation')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

const objectId = (value) => new mongoose.Types.ObjectId(value)
const dayPattern = /^\d{4}-\d{2}-\d{2}$/
function periodBounds(start, type, timezone = DEFAULT_ACADEMY_TIMEZONE) {
  if (!dayPattern.test(start || '') || !['day', 'week', 'month'].includes(type)) throw new Error('تاريخ الفترة غير صالح')
  const local = new Date(`${start}T12:00:00Z`)
  if (Number.isNaN(local.getTime()) || local.toISOString().slice(0, 10) !== start) throw new Error('تاريخ الفترة غير صالح')
  if (type === 'week' && local.getUTCDay() !== 1 || type === 'month' && local.getUTCDate() !== 1) throw new Error('اختر بداية الأسبوع أو الشهر')
  const end = new Date(local)
  if (type === 'day') end.setUTCDate(end.getUTCDate() + 1)
  if (type === 'week') end.setUTCDate(end.getUTCDate() + 7)
  if (type === 'month') end.setUTCMonth(end.getUTCMonth() + 1)
  return { from: fromZonedTime(`${start}T00:00:00`, timezone), to: fromZonedTime(`${end.toISOString().slice(0, 10)}T00:00:00`, timezone), timezone }
}

function denominator(counts) {
  return counts.attended + counts.absent + counts.apology + counts.unknown + counts.unresolved
}
function percent(numerator, base) { return base ? Math.round(numerator / base * 1000) / 10 : null }

async function academicAchievements({ start, end, supervisorId, category }) {
  async function count(model, field) {
    const [result] = await model.aggregate([
      { $match: { [field]: { $gte: start, $lt: end } } },
      ...ownershipStages('academic', `$${field}`),
      { $match: supervisorId ? { 'effectiveOwner.0.supervisorId': objectId(supervisorId) } : { 'effectiveOwner.0': { $exists: true } } },
      ...(category ? [{ $lookup: { from: User.collection.name, localField: 'teacherId', foreignField: '_id', as: 'teacher' } },
        { $match: { 'teacher.specializations': category } }] : []),
      { $group: { _id: '$studentId', count: { $sum: 1 }, lastChangedAt: { $max: '$updatedAt' } } },
      { $facet: { totals: [{ $group: { _id: null, records: { $sum: '$count' }, students: { $sum: 1 }, lastChangedAt: { $max: '$lastChangedAt' } } }],
        students: [{ $sort: { count: -1, _id: 1 } }, { $limit: 20 }] } },
    ]).allowDiskUse(true)
    return { records: result?.totals?.[0]?.records || 0, students: result?.totals?.[0]?.students || 0,
      lastChangedAt: result?.totals?.[0]?.lastChangedAt || null, rows: result?.students || [] }
  }
  const [memorization, revision, evaluation] = await Promise.all([
    count(Memorization, 'recordedAt'), count(Revision, 'recordedAt'), count(Evaluation, 'createdAt'),
  ])
  return { memorization, revision, evaluation,
    note: 'هذه أعداد سجلات الحفظ والمراجعة والتقييم المرتبطة بنطاق الفريق والفترة، وليست نقاط ترتيب أو حكمًا آليًا على الجودة.' }
}

async function metrics({ team, from, to, supervisorId, shiftId, category, evidence, page = 1, teacherPage = 1 }) {
  if (!['academic', 'administrative'].includes(team)) throw new Error('الفريق غير صالح')
  if (!(from instanceof Date) || !(to instanceof Date) || !(from < to) || to - from > 32 * 86400000) throw new Error('الفترة يجب ألا تتجاوز شهرًا')
  let start = from; let end = to; let shiftSnapshot = null
  if (shiftId) {
    if (!mongoose.isValidObjectId(shiftId)) throw new Error('الشيفت غير صالح')
    const shift = await Shift.findOne({ _id: shiftId, team, cancelledAt: null }).select('name startsAt endsAt members timezone').lean()
    if (!shift) throw new Error('الشيفت غير موجود')
    start = new Date(Math.max(start, shift.startsAt)); end = new Date(Math.min(end, shift.endsAt))
    shiftSnapshot = { _id: shift._id, name: shift.name, startsAt: shift.startsAt, endsAt: shift.endsAt, timezone: shift.timezone }
  }
  const empty = { total: 0, attended: 0, absent: 0, apology: 0, cancelled: 0, unknown: 0, unresolved: 0,
    observed: 0, rated: 0, submitted: 0, makeup: 0, studentAbsent: 0, teacherAbsent: 0 }
  const evidenceMatch = evidence === 'open' ? { bucket: { $in: ['unknown', 'unresolved'] } }
    : ['attended', 'absent', 'apology', 'cancelled', 'unknown', 'unresolved'].includes(evidence) ? { bucket: evidence }
    : ['observed', 'rated', 'submitted'].includes(evidence) ? { [evidence]: true } : null
  const safePage = Math.min(1000, Math.max(1, Number.parseInt(page, 10) || 1))
  const safeTeacherPage = Math.min(1000, Math.max(1, Number.parseInt(teacherPage, 10) || 1))
  if (!(start < end)) return { counts: empty, denominator: 0, percentages: null, days: [], teachers: [], samples: [], calculatedAt: new Date(),
    sourceFingerprint: crypto.createHash('sha256').update('empty').digest('hex'), shiftSnapshot }
  const pipeline = [
    { $match: { scheduledAt: { $gte: start, $lt: end } } },
    ...ownershipStages(team),
    { $match: supervisorId ? { 'effectiveOwner.0.supervisorId': objectId(supervisorId) } : { 'effectiveOwner.0': { $exists: true } } },
    ...(category ? [{ $lookup: { from: User.collection.name, localField: 'teacherId', foreignField: '_id', as: 'teacher' } },
      { $match: { 'teacher.specializations': category } }] : []),
    { $lookup: { from: Attendance.collection.name, let: { sessionId: '$_id' }, pipeline: [
      { $match: { isFinalized: true, $expr: { $eq: ['$sessionId', '$$sessionId'] } } }, { $limit: 1 },
      { $project: { status: 1, updatedAt: 1 } },
    ], as: 'attendance' } },
    ...(team === 'academic' ? [{ $lookup: { from: Observation.collection.name, let: { sessionId: '$_id' }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$sessionId', '$$sessionId'] }, ...(supervisorId ? [{ $eq: ['$supervisorId', objectId(supervisorId)] }] : [])] } } },
      { $project: { observation: 1, rating: 1, observationCategory: 1, submittedAt: 1, updatedAt: 1 } },
    ], as: 'reports' } }] : [{ $set: { reports: [] } }]),
    { $lookup: { from: Exception.collection.name, let: { sessionId: '$_id' }, pipeline: [
      { $match: { $expr: { $eq: ['$sessionId', '$$sessionId'] }, type: { $in: ['student_apology', 'teacher_apology', 'student_absence', 'teacher_absence'] } } },
      { $project: { type: 1, updatedAt: 1 } },
    ], as: 'exceptions' } },
    { $set: { attendanceStatus: { $arrayElemAt: ['$attendance.status', 0] }, exceptionTypes: '$exceptions.type',
      observed: { $in: ['observed', '$reports.observation'] },
      rated: { $anyElementTrue: { $map: { input: '$reports', as: 'r', in: { $and: [{ $eq: ['$$r.observation', 'observed'] }, { $ne: [{ $ifNull: ['$$r.rating', null] }, null] }] } } } },
      submitted: { $anyElementTrue: { $map: { input: '$reports', as: 'r', in: { $ne: [{ $ifNull: ['$$r.submittedAt', null] }, null] } } } },
      sourceUpdatedAt: { $max: { $concatArrays: [['$updatedAt'], '$attendance.updatedAt', '$reports.updatedAt', '$exceptions.updatedAt'] } },
    } },
    { $set: { bucket: { $switch: { branches: [
      { case: { $eq: ['$status', 'rescheduled'] }, then: 'cancelled' },
      { case: { $in: ['$attendanceStatus', ['present', 'late', 'left_early']] }, then: 'attended' },
      { case: { $or: [{ $in: ['$attendanceStatus', ['absent']] }, { $in: ['$outcome', ['teacher_absent', 'no_students_attended']] }, { $in: ['$status', ['missed', 'no_show']] }] }, then: 'absent' },
      { case: { $in: ['student_apology', '$exceptionTypes'] }, then: 'apology' },
      { case: { $in: ['teacher_apology', '$exceptionTypes'] }, then: 'apology' },
      { case: { $eq: ['$status', 'cancelled'] }, then: 'cancelled' },
      { case: { $eq: ['$status', 'completed'] }, then: 'unknown' },
    ], default: 'unresolved' } } } },
    { $project: { scheduledAt: 1, teacherId: 1, studentId: 1, status: 1, bucket: 1, observed: 1, rated: 1, submitted: 1,
      isMakeup: 1, exceptionTypes: 1, sourceUpdatedAt: 1, reports: 1 } },
    { $facet: {
      buckets: [{ $group: { _id: '$bucket', count: { $sum: 1 } } }],
      summary: [{ $group: { _id: null, total: { $sum: 1 }, observed: { $sum: { $cond: ['$observed', 1, 0] } },
        rated: { $sum: { $cond: ['$rated', 1, 0] } }, submitted: { $sum: { $cond: ['$submitted', 1, 0] } },
        makeup: { $sum: { $cond: ['$isMakeup', 1, 0] } },
        studentAbsent: { $sum: { $cond: [{ $in: ['student_absence', '$exceptionTypes'] }, 1, 0] } },
        teacherAbsent: { $sum: { $cond: [{ $in: ['teacher_absence', '$exceptionTypes'] }, 1, 0] } },
        lastChangedAt: { $max: '$sourceUpdatedAt' },
      } }],
      days: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledAt', timezone: DEFAULT_ACADEMY_TIMEZONE } }, total: { $sum: 1 },
        attended: { $sum: { $cond: [{ $eq: ['$bucket', 'attended'] }, 1, 0] } } } }, { $sort: { _id: 1 } }],
      teachers: [{ $group: { _id: '$teacherId', total: { $sum: 1 }, attended: { $sum: { $cond: [{ $eq: ['$bucket', 'attended'] }, 1, 0] } },
        observed: { $sum: { $cond: ['$observed', 1, 0] } }, rated: { $sum: { $cond: ['$rated', 1, 0] } } } }, { $sort: { _id: 1 } },
        { $skip: (safeTeacherPage - 1) * 20 }, { $limit: 20 }],
      teacherCount: [{ $group: { _id: '$teacherId' } }, { $count: 'total' }],
      categories: [{ $unwind: '$reports' }, { $match: { 'reports.observation': 'observed',
        'reports.submittedAt': { $ne: null },
        'reports.observationCategory': { $in: ['lesson_quality', 'teacher_commitment', 'student_progress', 'curriculum', 'attendance', 'technical', 'other'] } } },
        { $group: { _id: '$reports.observationCategory', reports: { $sum: 1 } } }, { $sort: { reports: -1, _id: 1 } }],
      samples: [...(evidenceMatch ? [{ $match: evidenceMatch }] : []), { $sort: { scheduledAt: -1, _id: -1 } }, { $skip: (safePage - 1) * 20 }, { $limit: 20 },
        { $project: { scheduledAt: 1, teacherId: 1, studentId: 1, bucket: 1, observed: 1, rated: 1 } }],
      evidenceCount: [...(evidenceMatch ? [{ $match: evidenceMatch }] : []), { $count: 'total' }],
    } },
  ]
  const [result] = await Session.aggregate(pipeline).allowDiskUse(true)
  const summary = result.summary[0] || {}
  const teacherIds = result.teachers.map((row) => row._id)
  const teacherPeople = teacherIds.length ? await User.find({ _id: { $in: teacherIds } }).select('firstNameAr lastNameAr').lean() : []
  const teacherNames = new Map(teacherPeople.map((row) => [String(row._id), `${row.firstNameAr || ''} ${row.lastNameAr || ''}`.trim()]))
  const counts = { ...empty, ...Object.fromEntries(result.buckets.map(({ _id, count }) => [_id, count])),
    ...Object.fromEntries(['total', 'observed', 'rated', 'submitted', 'makeup', 'studentAbsent', 'teacherAbsent'].map((key) => [key, summary[key] || 0])) }
  const base = denominator(counts)
  const achievements = team === 'academic' ? await academicAchievements({ start, end, supervisorId, category }) : null
  const digest = { counts, categories: result.categories || [], lastChangedAt: summary.lastChangedAt || null,
    achievements: achievements && ['memorization', 'revision', 'evaluation'].map((key) => ({ records: achievements[key].records,
      lastChangedAt: achievements[key].lastChangedAt })) }
  return { counts, denominator: base, percentages: base ? { attended: percent(counts.attended, base), absent: percent(counts.absent, base), apology: percent(counts.apology, base) } : null,
    days: result.days, teachers: result.teachers.map((row) => ({ ...row, name: teacherNames.get(String(row._id)) || 'معلم' })), samples: result.samples,
    evidenceTotal: result.evidenceCount?.[0]?.total || 0, evidencePage: safePage,
    teacherTotal: result.teacherCount?.[0]?.total || 0, teacherPage: safeTeacherPage,
    observationCategories: result.categories || [], achievements, calculatedAt: new Date(),
    sourceFingerprint: crypto.createHash('sha256').update(JSON.stringify(digest)).digest('hex'), shiftSnapshot,
    source: { sessions: 'Session', attendance: 'Attendance', observation: 'AcademicObservationReport', exceptions: 'SupervisionException',
      note: 'المقام يستبعد الملغاة والموعد المستبدل، ويشمل غير المحسوم ومكتمل الحصة بلا حضور مثبت. المتابعة والتقييم والتقرير عدادات منفصلة للحصص المميزة.' } }
}

module.exports = { periodBounds, metrics, denominator, percent, academicAchievements }

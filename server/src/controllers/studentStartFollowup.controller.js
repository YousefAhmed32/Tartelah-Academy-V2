const mongoose = require('mongoose')
const User = require('../models/User')
const Session = require('../models/Session')
const ScheduleRule = require('../models/ScheduleRule')
const Assignment = require('../models/SupervisionAssignment')
const Followup = require('../models/StudentStartFollowup')
const { sendSuccess, sendError } = require('../utils/response')
const { createNotifications } = require('../services/notification.service')
const { logAction } = require('../services/audit.service')

const id = (value) => String(value?._id || value || '')
const admin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.view')
const administrative = (user) => admin(user) || user.supervisionTeam === 'administrative'
const canManage = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.manage') || user.supervisionTeam === 'administrative'
const recent = () => new Date(Date.now() - 90 * 86400000)

async function firstCompleted(studentId) {
  return Session.findOne({ studentId, status: 'completed', quranReportRequired: { $ne: false } })
    .sort({ scheduledAt: 1, _id: 1 }).select('_id teacherId studentId scheduledAt completedAt status').lean()
}

async function canAccess(user, session) {
  if (admin(user)) return true
  if (user.supervisionTeam !== 'administrative') return false
  if (user.supervisionPosition === 'manager') return true
  return !!await Assignment.exists({ team: 'administrative', supervisorId: user._id, teacherId: session.teacherId,
    startsAt: { $lte: new Date() }, $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] })
}

exports.myFeedback = async (req, res, next) => {
  try {
    const session = await firstCompleted(req.user._id)
    if (!session) return sendSuccess(res, { eligible: false })
    const row = await Followup.findOne({ studentId: req.user._id }).select('rating comment feedbackAt').lean()
    const completedAt = session.completedAt || session.scheduledAt
    sendSuccess(res, { eligible: !row?.feedbackAt && Date.now() - new Date(completedAt).getTime() <= 30 * 86400000,
      firstSessionId: session._id, feedback: row?.feedbackAt ? { rating: row.rating, comment: row.comment, at: row.feedbackAt } : null })
  } catch (error) { next(error) }
}

exports.submitFeedback = async (req, res, next) => {
  try {
    const rating = Number(req.body?.rating)
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : ''
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1500) return sendError(res, 'اختر تقييمًا من 1 إلى 5 واكتب ملاحظة مختصرة إن أردت', 400)
    const session = await firstCompleted(req.user._id)
    if (!session || Date.now() - new Date(session.completedAt || session.scheduledAt).getTime() > 30 * 86400000) return sendError(res, 'طلب الرأي متاح بعد أول حلقة فعلية لمدة 30 يومًا', 409)
    let row
    try {
      row = await Followup.findOneAndUpdate({ studentId: req.user._id, feedbackAt: { $exists: false } },
        { $set: { rating, comment, feedbackAt: new Date() }, $setOnInsert: { firstSessionId: session._id } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })
    } catch (error) {
      if (error.code === 11000) return sendError(res, 'تم إرسال رأيك بالفعل', 409)
      throw error
    }
    if (!row) return sendError(res, 'تم إرسال رأيك بالفعل', 409)
    if (rating <= 2) {
      const [managers, owners] = await Promise.all([
        User.find({ supervisionTeam: 'administrative', supervisionPosition: 'manager', isActive: true }).select('_id').lean(),
        Assignment.find({ team: 'administrative', teacherId: session.teacherId, startsAt: { $lte: session.scheduledAt }, $or: [{ endsAt: null }, { endsAt: { $gt: session.scheduledAt } }] }).select('supervisorId').lean(),
      ])
      const recipients = [...new Set([...managers.map(id), ...owners.map((item) => id(item.supervisorId))])]
      await createNotifications(recipients.map((userId) => ({ userId, type: 'assignment', titleAr: 'رأي الطالب بعد أول حلقة يحتاج متابعة',
        bodyAr: 'قيّم الطالب تجربته الأولى بدرجة منخفضة. راجع التفاصيل في متابعة الطلاب الجدد.',
        actionUrl: '/admin/supervision/administrative', metadata: { dedupeKey: `first-lesson-feedback:${row._id}` } })))
        .catch((error) => console.error('[supervision] first lesson feedback notification:', error))
    }
    sendSuccess(res, { rating: row.rating, comment: row.comment, at: row.feedbackAt }, 'شكرًا، وصلنا رأيك وسنستفيد منه')
  } catch (error) { next(error) }
}

exports.list = async (req, res, next) => {
  try {
    if (!administrative(req.user)) return sendError(res, 'متابعة الطلاب الجدد للإشراف الإداري', 403)
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 15))
    const since = recent()
    let students, total
    if (!admin(req.user) && req.user.supervisionPosition !== 'manager') {
      const assignments = await Assignment.find({ team: 'administrative', supervisorId: req.user._id,
        startsAt: { $lte: new Date() }, $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] })
        .select('teacherId startsAt endsAt').lean()
      if (!assignments.length) return res.status(200).json({ success: true, data: [], total: 0, page, limit })
      const periods = assignments.map((row) => ({ teacherId: row.teacherId, scheduledAt: { $gte: since } }))
      const result = await Session.aggregate([
        { $match: { $or: periods } },
        { $group: { _id: '$studentId' } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
        { $unwind: '$student' },
        { $match: { 'student.role': 'student', 'student.createdAt': { $gte: since } } },
        { $sort: { 'student.createdAt': -1, _id: -1 } },
        { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $replaceRoot: { newRoot: '$student' } }], count: [{ $count: 'value' }] } },
      ])
      students = result[0]?.rows || []; total = result[0]?.count?.[0]?.value || 0
    } else {
      const filter = { role: 'student', createdAt: { $gte: since }, isActive: true }
      ;[students, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
          .select('_id firstNameAr lastNameAr createdAt').lean(), User.countDocuments(filter),
      ])
    }
    const studentIds = students.map((row) => row._id)
    const [firstSessions, firstCompletedSessions, followups, schedules] = studentIds.length ? await Promise.all([
      Session.aggregate([{ $match: { studentId: { $in: studentIds }, quranReportRequired: { $ne: false } } },
        { $sort: { scheduledAt: 1, _id: 1 } }, { $group: { _id: '$studentId', first: { $first: { _id: '$_id', scheduledAt: '$scheduledAt', status: '$status', teacherId: '$teacherId' } } } }]),
      Session.aggregate([{ $match: { studentId: { $in: studentIds }, quranReportRequired: { $ne: false }, status: 'completed' } },
        { $sort: { scheduledAt: 1, _id: 1 } }, { $group: { _id: '$studentId', first: { $first: { _id: '$_id', scheduledAt: '$scheduledAt' } } } }]),
      Followup.find({ studentId: { $in: studentIds } }).select('studentId rating comment feedbackAt stabilizedAt stabilizationNote').lean(),
      ScheduleRule.aggregate([{ $match: { studentId: { $in: studentIds }, status: 'active' } }, { $group: { _id: '$studentId', count: { $sum: 1 } } }]),
    ]) : [[], [], [], []]
    const firstById = new Map(firstSessions.map((row) => [id(row._id), row.first]))
    const completedById = new Map(firstCompletedSessions.map((row) => [id(row._id), row.first]))
    const followById = new Map(followups.map((row) => [id(row.studentId), row]))
    const scheduleById = new Map(schedules.map((row) => [id(row._id), row.count]))
    const data = students.map((student) => ({ _id: student._id, firstNameAr: student.firstNameAr, lastNameAr: student.lastNameAr,
      createdAt: student.createdAt, firstSession: firstById.get(id(student)) || null, firstCompletedSession: completedById.get(id(student)) || null,
      feedback: followById.get(id(student)) || null, activeScheduleCount: scheduleById.get(id(student)) || 0 }))
    res.status(200).json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) { next(error) }
}

exports.stabilize = async (req, res, next) => {
  try {
    if (!canManage(req.user) || !mongoose.isValidObjectId(req.params.studentId)) return sendError(res, 'غير مصرح', 403)
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : ''
    if (!note || note.length > 1000) return sendError(res, 'اكتب سبب تثبيت المواعيد باختصار', 400)
    const [session, activeSchedule] = await Promise.all([firstCompleted(req.params.studentId), ScheduleRule.exists({ studentId: req.params.studentId, status: 'active' })])
    if (!session || !activeSchedule) return sendError(res, 'يلزم إتمام أول حلقة ووجود جدول متكرر نشط', 409)
    if (!await canAccess(req.user, session)) return sendError(res, 'هذه الحصة خارج تكليفك', 403)
    let row
    try {
      row = await Followup.findOneAndUpdate({ studentId: req.params.studentId, stabilizedAt: { $exists: false } },
        { $set: { stabilizedAt: new Date(), stabilizedBy: req.user._id, stabilizationNote: note }, $setOnInsert: { firstSessionId: session._id } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })
    } catch (error) {
      if (error.code === 11000) return sendError(res, 'تم تثبيت المواعيد بالفعل', 409)
      throw error
    }
    if (!row) return sendError(res, 'تم تثبيت المواعيد بالفعل', 409)
    await logAction({ actorId: req.user._id, actorRole: req.user.role, action: 'student_start_schedule_stabilized', entity: 'StudentStartFollowup', entityId: row._id,
      changes: { studentId: req.params.studentId, firstSessionId: session._id, note }, ip: req.ip })
    sendSuccess(res, row, 'تم تثبيت مواعيد الطالب')
  } catch (error) { next(error) }
}

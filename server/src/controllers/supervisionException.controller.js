const mongoose = require('mongoose')
const Session = require('../models/Session')
const User = require('../models/User')
const Assignment = require('../models/SupervisionAssignment')
const Attendance = require('../models/Attendance')
const Exception = require('../models/SupervisionException')
const Adjustment = require('../models/SupervisionAdjustmentRequest')
const TeacherPayrollEntry = require('../models/TeacherPayrollEntry')
const booking = require('../services/booking.service')
const lessonDeduction = require('../services/lessonDeduction.service')
const compensation = require('../services/compensation.service')
const financial = require('../services/financialAdjustment.service')
const wallet = require('../services/wallet.service')
const { createNotification, createNotifications } = require('../services/notification.service')
const { logAction } = require('../services/audit.service')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getAcademyTimezone } = require('../services/academySettings.service')
const { parseAcademyDateTime, formatAcademyDateTimeAr } = require('../utils/academyDateTime')

const id = (value) => String(value?._id || value || '')
const validId = (value) => mongoose.isValidObjectId(value)
const admin = (user) => user.isPrimaryAdmin || user.role === 'admin' && user.hasPermission('supervision.view')
const administrative = (user) => admin(user) && user.hasPermission('supervision.manage') || user.supervisionTeam === 'administrative'
const manager = (user) => admin(user) && user.hasPermission('supervision.manage') || user.supervisionTeam === 'administrative' && user.supervisionPosition === 'manager' && user.hasPermission('supervision.manage')
const text = (value, limit = 1000) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= limit ? value.trim() : null
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null
const types = ['student_apology', 'teacher_apology', 'student_absence', 'teacher_absence', 'delay', 'postpone', 'advance', 'reschedule', 'link_issue', 'substitute', 'compensation', 'other']
const actions = ['reschedule', 'cancel', 'substitute', 'update_link', 'report_delay', 'grant_compensation', 'schedule_makeup']

async function assigned(user, team, teacherId, at) {
  if (admin(user)) return true
  if (user.supervisionTeam !== team) return false
  return !!await Assignment.exists({ team, teacherId: Array.isArray(teacherId) ? { $in: teacherId.filter(Boolean) } : teacherId,
    ...(!user.supervisionPosition || user.supervisionPosition !== 'manager' ? { supervisorId: user._id } : {}),
    startsAt: { $lte: at }, $or: [{ endsAt: null }, { endsAt: { $gt: at } }],
  })
}

async function visibleFilter(user, team = 'administrative') {
  if (admin(user)) return {}
  if (user.supervisionTeam !== team) return { _id: { $in: [] } }
  if (user.supervisionPosition === 'supervisor' && team === 'administrative') return { ownerId: user._id }
  const rows = await Assignment.find({ team, ...(!user.supervisionPosition || user.supervisionPosition !== 'manager' ? { supervisorId: user._id } : {}) }).select('teacherId startsAt endsAt').lean()
  return { $or: rows.flatMap((row) => ['originalTeacherId', 'currentTeacherId'].map((field) => ({ [field]: row.teacherId, sessionScheduledAt: { $gte: row.startsAt, ...(row.endsAt ? { $lt: row.endsAt } : {}) } }))) }
}

function audit(req, action, entity, entityId, changes) {
  return logAction({ actorId: req.user._id, actorRole: req.user.role, action, entity, entityId, changes, ip: req.ip })
}

async function inform(caseRow, message) {
  const session = await Session.findById(caseRow.sessionId).select('scheduledAt teacherId').lean()
  const at = session?.scheduledAt || new Date()
  const [managers, academics, admins] = await Promise.all([
    User.find({ isActive: true, supervisionTeam: 'administrative', supervisionPosition: 'manager' }).select('_id').lean(),
    Assignment.find({ team: 'academic', teacherId: { $in: [...new Set([id(caseRow.originalTeacherId), id(session?.teacherId)])] }, startsAt: { $lte: at }, $or: [{ endsAt: null }, { endsAt: { $gt: at } }] }).select('supervisorId').lean(),
    User.find({ isActive: true, role: 'admin', isPrimaryAdmin: true }).select('_id').lean(),
  ])
  const administrativeRecipients = [...new Set([id(caseRow.ownerId), ...managers.map(id), ...admins.map(id)])]
  const academicRecipients = [...new Set(academics.map((row) => id(row.supervisorId)))].filter((person) => !administrativeRecipients.includes(person))
  await createNotifications([
    ...administrativeRecipients.map((userId) => ({ userId, actionUrl: '/admin/supervision/administrative' })),
    ...academicRecipients.map((userId) => ({ userId, actionUrl: '/admin/supervision/academic' })),
  ].map((recipient) => ({ ...recipient, type: 'assignment', titleAr: 'تحديث حالة حصة', bodyAr: message,
    metadata: { dedupeKey: `exception:${caseRow._id}:${caseRow.updatedAt?.getTime() || Date.now()}` } })))
}

exports.list = async (req, res, next) => {
  try {
    const team = req.query.team || req.user.supervisionTeam || 'administrative'
    if (!['academic', 'administrative'].includes(team) || !admin(req.user) && team !== req.user.supervisionTeam) return sendError(res, 'غير مصرح', 403)
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
    const filter = await visibleFilter(req.user, team)
    if (req.query.status === 'open' || req.query.status === 'resolved') filter.status = req.query.status
    if (validId(req.query.sessionId)) filter.sessionId = req.query.sessionId
    const [rows, total] = await Promise.all([
      Exception.find(filter).sort({ status: 1, followUpAt: 1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('sessionId', 'titleAr scheduledAt status teacherId studentId').populate('ownerId', 'firstNameAr lastNameAr').populate('makeupSessionId', 'status scheduledAt').lean(),
      Exception.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (error) { next(error) }
}

exports.create = async (req, res, next) => {
  try {
    if (!administrative(req.user)) return sendError(res, 'إنشاء الحالات من اختصاص الإشراف الإداري', 403)
    const { sessionId, type, ownerId, followUpAt } = req.body || {}
    const reason = text(req.body?.reason)
    const due = date(followUpAt)
    if (!validId(sessionId) || !validId(ownerId) || !types.includes(type) || !reason || !due || due <= new Date()) return sendError(res, 'الحصة والنوع والسبب والمسؤول وموعد المتابعة مطلوبة', 400)
    const session = await Session.findById(sessionId).select('teacherId supervisionOriginalTeacherId studentId scheduledAt').lean()
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    const cohort = [session.teacherId, session.supervisionOriginalTeacherId].filter(Boolean)
    if (!await assigned(req.user, 'administrative', cohort, session.scheduledAt)) return sendError(res, 'غير مكلف بهذه الحصة', 403)
    const owner = await User.findOne({ _id: ownerId, isActive: true, supervisionTeam: 'administrative', supervisionPosition: { $in: ['supervisor', 'manager'] } }).select('_id supervisionTeam supervisionPosition').lean()
    if (!owner || owner.supervisionPosition === 'supervisor' && !await assigned(owner, 'administrative', cohort, session.scheduledAt)) return sendError(res, 'المسؤول غير مكلف بهذه الحصة', 400)
    const row = await Exception.create({ sessionId, originalTeacherId: session.supervisionOriginalTeacherId || session.teacherId, currentTeacherId: session.teacherId, sessionScheduledAt: session.scheduledAt, studentId: session.studentId, type, reason, ownerId, followUpAt: due, createdBy: req.user._id })
    await audit(req, 'supervision_exception_create', 'SupervisionException', row._id, { sessionId, type, ownerId, followUpAt: due })
    await inform(row, `سُجلت حالة ${type} للحصة، والمسؤول عن المتابعة محدد حتى ${due.toISOString()}`).catch((error) => console.error('[supervision] exception notice:', error))
    sendSuccess(res, row, 'تم تسجيل الحالة ومسؤول المتابعة', 201)
  } catch (error) { next(error) }
}

async function applyOperation(row, session, action, payload, actor) {
  const reason = row.reason
  if (action === 'reschedule') {
    const timezone = await getAcademyTimezone()
    const nextDate = parseAcademyDateTime(payload.newDate, timezone)
    if (Number.isNaN(nextDate.getTime()) || nextDate <= new Date()) throw Object.assign(new Error('الموعد الجديد غير صالح'), { status: 400 })
    if (new Date(session.scheduledAt).getTime() === nextDate.getTime()) return { scheduledAt: nextDate }
    if (!['scheduled', 'missed', 'no_show'].includes(session.status) || session.teacherStartedAt || session.subscriptionConsumed) throw Object.assign(new Error('لا يمكن تغيير موعد حصة بدأت أو استُهلكت'), { status: 409 })
    await booking.assertNoConflict({ teacherId: session.teacherId, studentId: session.studentId, scheduledAt: nextDate, durationMinutes: session.durationMinutes, excludeSessionId: session._id })
    await Attendance.deleteMany({ sessionId: session._id })
    const previous = session.scheduledAt
    session.rescheduledFrom = previous; session.scheduledAt = nextDate; session.status = 'scheduled'; session.isPostponed = true; session.isException = true
    session.postponedAt = new Date(); session.postponedReason = reason
    session.administrativeReadiness = { student: 'unknown', teacher: 'unknown', link: 'unknown' }
    session.teacherStartedAt = undefined; session.teacherEndedAt = undefined; session.teacherAttendanceStatus = 'pending'; session.teacherLateMinutes = 0
    session.studentAttendanceStatus = 'pending'; session.studentJoinedAt = undefined; session.actualStartAt = undefined; session.actualEndAt = undefined
    session.outcome = 'pending_review'; session.payrollStatus = 'pending'; session.payrollStatusSetBy = 'system'; session.payrollStatusReason = undefined
    await session.save()
    const bodyAr = `تغير موعد حصة "${session.titleAr}" إلى ${formatAcademyDateTimeAr(nextDate, timezone)} — ${reason}`
    await createNotifications([{ userId: session.studentId, actionUrl: '/student/sessions' }, { userId: session.teacherId, actionUrl: '/teacher/sessions' }].map((item) => ({ ...item, type: 'session', titleAr: 'تغيير موعد الحصة', bodyAr, relatedId: session._id })))
    return { previous, scheduledAt: nextDate }
  }
  if (action === 'cancel') {
    if (session.status === 'cancelled') return { cancelled: true, compensationRequired: session.compensationRequired }
    if (!['scheduled', 'missed', 'no_show'].includes(session.status) || session.teacherStartedAt) throw Object.assign(new Error('لا يمكن إلغاء حصة بدأت أو اكتملت'), { status: 409 })
    const cancelledByRole = payload.cancelledByRole === 'student' ? 'student' : payload.cancelledByRole === 'teacher' ? 'teacher' : 'admin'
    session.status = 'cancelled'; session.cancelledAt = new Date(); session.cancelReason = reason; session.cancelledBy = actor._id
    session.outcome = cancelledByRole === 'student' ? 'cancelled_by_student' : cancelledByRole === 'teacher' ? 'cancelled_by_teacher' : 'cancelled_by_admin'
    session.payrollStatus = 'excluded'; session.payrollStatusSetBy = 'system'; session.payrollStatusReason = 'الحصة ملغاة'
    const walletImpact = await lessonDeduction.handleCancellation(session, { cancelledByRole, reason, performedBy: actor._id })
    await session.save()
    await createNotifications([{ userId: session.studentId, actionUrl: '/student/sessions' }, { userId: session.teacherId, actionUrl: '/teacher/sessions' }].map((item) => ({ ...item, type: 'session', titleAr: 'تم إلغاء الحصة', bodyAr: `أُلغيت حصة "${session.titleAr}" — ${reason}`, relatedId: session._id })))
    return { cancelled: true, walletImpact }
  }
  if (action === 'substitute') {
    if (!validId(payload.teacherId)) throw Object.assign(new Error('اختر معلمًا بديلاً'), { status: 400 })
    if (id(session.teacherId) === id(payload.teacherId)) return { teacherId: session.teacherId }
    if (session.status !== 'scheduled' || session.teacherStartedAt || session.scheduledAt <= new Date()) throw Object.assign(new Error('البديل متاح قبل بدء الحصة فقط'), { status: 409 })
    const replacement = await User.findOne({ _id: payload.teacherId, role: 'teacher', isActive: true }).select('meetingLinks').lean()
    if (!replacement) throw Object.assign(new Error('المعلم البديل غير نشط'), { status: 400 })
    await booking.assertNoConflict({ teacherId: replacement._id, studentId: session.studentId, scheduledAt: session.scheduledAt, durationMinutes: session.durationMinutes, excludeSessionId: session._id })
    const previousTeacherId = session.teacherId
    session.supervisionOriginalTeacherId = session.supervisionOriginalTeacherId || previousTeacherId
    session.teacherId = replacement._id; session.isException = true
    session.meetingLink = payload.meetingLink || replacement.meetingLinks?.[0]?.link || ''
    session.meetingProvider = replacement.meetingLinks?.[0]?.provider || session.meetingProvider
    session.administrativeReadiness = { student: 'unknown', teacher: 'unknown', link: 'unknown' }
    await session.save()
    await Exception.updateMany({ sessionId: session._id }, { $set: { currentTeacherId: replacement._id } })
    await createNotifications([{ userId: session.studentId, actionUrl: '/student/sessions' }, { userId: previousTeacherId, actionUrl: '/teacher/sessions' }, { userId: replacement._id, actionUrl: '/teacher/sessions' }].map((item) => ({ ...item, type: 'session', titleAr: 'تغيير معلم الحصة', bodyAr: `تغير معلم حصة "${session.titleAr}" — ${reason}`, relatedId: session._id })))
    return { previousTeacherId, teacherId: replacement._id }
  }
  if (action === 'update_link') {
    const link = text(payload.meetingLink, 500)
    if (!link || !/^https:\/\//i.test(link)) throw Object.assign(new Error('أدخل رابط اجتماع آمنًا'), { status: 400 })
    if (!['scheduled', 'ongoing'].includes(session.status)) throw Object.assign(new Error('لا يمكن تغيير رابط حصة منتهية'), { status: 409 })
    if (session.meetingLink === link) return { meetingLink: link }
    session.meetingLink = link; session.set('administrativeReadiness.link', 'unknown'); session.isException = true
    await session.save()
    await createNotifications([{ userId: session.studentId, actionUrl: '/student/sessions' }, { userId: session.teacherId, actionUrl: '/teacher/sessions' }].map((item) => ({ ...item, type: 'session', titleAr: 'رابط الحصة الجديد', bodyAr: `تغير رابط حصة "${session.titleAr}"`, relatedId: session._id })))
    return { meetingLink: link }
  }
  if (action === 'report_delay') {
    const minutes = Number(payload.minutes)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240 || !['scheduled', 'ongoing'].includes(session.status)) throw Object.assign(new Error('مدة التأخير أو حالة الحصة غير صالحة'), { status: 400 })
    session.delayMinutes = minutes; session.delayReasonCode = ['teacher_delay', 'student_delay', 'technical_issue', 'emergency', 'other'].includes(payload.reasonCode) ? payload.reasonCode : 'other'; session.delayNote = reason
    await session.save()
    return { minutes }
  }
  if (action === 'grant_compensation' || action === 'schedule_makeup') {
    if (action === 'schedule_makeup') {
      const timezone = await getAcademyTimezone()
      const at = parseAcademyDateTime(payload.scheduledAt, timezone)
      const teacherId = validId(payload.teacherId) ? payload.teacherId : session.teacherId
      if (Number.isNaN(at.getTime()) || at <= new Date()) throw Object.assign(new Error('موعد التعويض غير صالح'), { status: 400 })
      const existing = await Session.findOne({ makeupForSessionId: session._id, status: { $in: ['scheduled', 'ongoing', 'completed', 'missed', 'no_show'] } })
      if (existing) return { makeupSessionId: existing._id, status: existing.status }
      const teacher = await User.findOne({ _id: teacherId, role: 'teacher', isActive: true }).select('meetingLinks').lean()
      if (!teacher) throw Object.assign(new Error('المعلم غير صالح'), { status: 400 })
      await booking.assertNoConflict({ teacherId, studentId: session.studentId, scheduledAt: at, durationMinutes: session.durationMinutes })
      await compensation.grantCompensation(session, { reason, grantedByRole: 'admin', grantedBy: actor._id })
      await session.save()
      let makeup
      try {
        makeup = await Session.create({ studentId: session.studentId, teacherId, titleAr: `تعويض: ${session.titleAr}`, scheduledAt: at, durationMinutes: session.durationMinutes,
          meetingLink: payload.meetingLink || teacher.meetingLinks?.[0]?.link || '', meetingProvider: teacher.meetingLinks?.[0]?.provider || session.meetingProvider,
          isMakeup: true, isException: true, makeupForSessionId: session._id })
      } catch (error) {
        if (error.code !== 11000) throw error
        makeup = await Session.findOne({ makeupForSessionId: session._id, status: { $in: ['scheduled', 'ongoing', 'completed', 'missed', 'no_show'] } })
        if (!makeup) throw error
      }
      await createNotifications([{ userId: session.studentId, actionUrl: '/student/sessions' }, { userId: teacherId, actionUrl: '/teacher/sessions' }].map((item) => ({ ...item, type: 'session', titleAr: 'جدولة حصة تعويضية', bodyAr: `تحدد تعويض حصة "${session.titleAr}" في ${formatAcademyDateTimeAr(at, timezone)}`, relatedId: makeup._id })))
      return { makeupSessionId: makeup._id, status: makeup.status }
    }
    const granted = await compensation.grantCompensation(session, { reason, grantedByRole: 'admin', grantedBy: actor._id })
    await session.save()
    return { compensationTransactionId: session.compensationGrantedTransactionId, alreadyGranted: granted.alreadyGranted }
  }
  throw Object.assign(new Error('الإجراء غير صالح'), { status: 400 })
}

exports.apply = async (req, res, next) => {
  try {
    if (!administrative(req.user) || !validId(req.params.id) || !actions.includes(req.body?.action)) return sendError(res, 'الإجراء غير صالح أو غير مصرح', 403)
    const row = await Exception.findById(req.params.id)
    if (!row) return sendError(res, 'الحالة غير موجودة', 404)
    if (!admin(req.user) && id(row.ownerId) !== id(req.user._id) && !manager(req.user)) return sendError(res, 'غير مسؤول عن هذه الحالة', 403)
    if (row.status !== 'open' || row.actionState === 'applied' || row.actionState === 'processing') return sendError(res, 'هذا الإجراء منفذ أو قيد التنفيذ بالفعل', 409)
    const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {}
    if (row.actionState === 'failed' && (row.action !== req.body.action || JSON.stringify(row.actionPayload || {}) !== JSON.stringify(payload))) return sendError(res, 'أعد محاولة نفس الإجراء؛ لا يمكن تغيير قرار سبق بدء تنفيذه', 409)
    const locked = await Exception.findOneAndUpdate({ _id: row._id, status: 'open', actionState: { $in: ['none', 'failed'] } },
      { $set: { actionState: 'processing', action: req.body.action, actionPayload: payload, actorId: req.user._id, actionError: null } }, { new: true })
    if (!locked) return sendError(res, 'يُعالج هذا الإجراء حاليًا', 409)
    try {
      const session = await Session.findById(row.sessionId)
      if (!session) throw Object.assign(new Error('الحصة غير موجودة'), { status: 404 })
      const result = await applyOperation(row, session, locked.action, payload, req.user)
      if (session.compensationRequired && ['cancel', 'grant_compensation'].includes(locked.action)) {
        await Exception.findOneAndUpdate({ parentCaseId: locked._id }, { $setOnInsert: {
          parentCaseId: locked._id, sessionId: row.sessionId, originalTeacherId: row.originalTeacherId, currentTeacherId: session.teacherId,
          sessionScheduledAt: row.sessionScheduledAt, studentId: row.studentId, type: 'compensation', reason: `متابعة تعويض: ${row.reason}`,
          ownerId: row.ownerId, followUpAt: row.followUpAt > new Date() ? row.followUpAt : new Date(Date.now() + 86400000), createdBy: req.user._id,
        } }, { upsert: true, new: true, setDefaultsOnInsert: true })
      }
      locked.actionState = 'applied'; locked.actionResult = result; locked.actionAt = new Date(); locked.makeupSessionId = result.makeupSessionId || undefined
      await locked.save()
      await audit(req, `supervision_exception_${locked.action}`, 'SupervisionException', locked._id, { sessionId: row.sessionId, result })
      await inform(locked, `نُفذ إجراء ${locked.action} للحصة — ${row.reason}`).catch((error) => console.error('[supervision] exception notice:', error))
      sendSuccess(res, locked, 'تم تنفيذ الإجراء وتسجيله')
    } catch (error) {
      locked.actionState = 'failed'; locked.actionError = String(error.message || 'تعذر التنفيذ').slice(0, 500)
      await locked.save()
      if (error.name === 'BookingConflictError') return sendError(res, error.message, 409, { conflictingSessionId: error.conflictingSessionId })
      if (error.status) return sendError(res, error.message, error.status)
      next(error)
    }
  } catch (error) { next(error) }
}

exports.retry = async (req, res, next) => {
  try {
    if (!administrative(req.user) || !validId(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const row = await Exception.findById(req.params.id)
    if (!row || row.status !== 'open' || !['processing', 'failed'].includes(row.actionState) || !actions.includes(row.action)) return sendError(res, 'لا يوجد إجراء معلّق لإعادة المحاولة', 409)
    if (!admin(req.user) && id(row.ownerId) !== id(req.user._id) && !manager(req.user)) return sendError(res, 'غير مسؤول عن هذه الحالة', 403)
    if (row.actionState === 'processing') {
      const stale = await Exception.findOneAndUpdate({ _id: row._id, actionState: 'processing', updatedAt: { $lt: new Date(Date.now() - 60000) } }, { $set: { actionState: 'failed' } })
      if (!stale) return sendError(res, 'انتظر دقيقة للتأكد من انتهاء المحاولة السابقة', 409)
    }
    req.body = { action: row.action, payload: row.actionPayload || {} }
    return exports.apply(req, res, next)
  } catch (error) { next(error) }
}

exports.resolve = async (req, res, next) => {
  try {
    if (!administrative(req.user) || !validId(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const resolution = text(req.body?.resolution)
    if (!resolution) return sendError(res, 'اكتب نتيجة الحالة', 400)
    const row = await Exception.findById(req.params.id)
    if (!row) return sendError(res, 'الحالة غير موجودة', 404)
    if (!admin(req.user) && !manager(req.user) && id(row.ownerId) !== id(req.user._id)) return sendError(res, 'غير مسؤول عن هذه الحالة', 403)
    if (row.status !== 'open' || row.actionState === 'processing' || row.actionState === 'failed') return sendError(res, 'الحالة مغلقة أو الإجراء لم يكتمل', 409)
    const sourceSession = await Session.findById(row.sessionId).select('compensationRequired').lean()
    if (row.makeupSessionId || sourceSession?.compensationRequired) {
      const makeup = await Session.findOne({ makeupForSessionId: row.sessionId, status: 'completed' }).select('status').lean()
      if (makeup?.status !== 'completed') return sendError(res, 'أغلق التعويض بعد إتمام الحصة التعويضية فقط', 409)
    }
    const closed = await Exception.findOneAndUpdate({ _id: row._id, status: 'open' }, { $set: { status: 'resolved', resolution, resolvedAt: new Date(), resolvedBy: req.user._id } }, { new: true })
    if (!closed) return sendError(res, 'الحالة مغلقة بالفعل', 409)
    await audit(req, 'supervision_exception_resolve', 'SupervisionException', closed._id, { resolution })
    sendSuccess(res, closed, 'تم إغلاق الحالة مع حفظ سجلها')
  } catch (error) { next(error) }
}

exports.reassign = async (req, res, next) => {
  try {
    if (!manager(req.user) || !validId(req.params.id) || !validId(req.body?.ownerId)) return sendError(res, 'تبديل المسؤول لمدير الإداري أو الإدارة العامة', 403)
    const followUpAt = date(req.body?.followUpAt)
    if (!followUpAt || followUpAt <= new Date()) return sendError(res, 'حدد موعد متابعة قادمًا', 400)
    const row = await Exception.findById(req.params.id)
    if (!row || row.status !== 'open') return sendError(res, 'الحالة غير متاحة', 404)
    const owner = await User.findOne({ _id: req.body.ownerId, isActive: true, supervisionTeam: 'administrative', supervisionPosition: { $in: ['manager', 'supervisor'] } }).select('_id supervisionPosition').lean()
    if (!owner) return sendError(res, 'المسؤول الجديد غير صالح', 400)
    if (owner.supervisionPosition === 'supervisor' && !await Assignment.exists({ team: 'administrative', supervisorId: owner._id, teacherId: row.originalTeacherId,
      startsAt: { $lte: new Date() }, $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] })) return sendError(res, 'المسؤول الجديد غير مكلف بهذا المعلم حاليًا', 400)
    const previousOwnerId = row.ownerId
    row.ownerId = owner._id; row.followUpAt = followUpAt
    await row.save()
    await audit(req, 'supervision_exception_reassign', 'SupervisionException', row._id, { previousOwnerId, ownerId: owner._id, followUpAt })
    await inform(row, `انتقلت متابعة الحالة إلى مسؤول جديد حتى ${followUpAt.toISOString()}`).catch((error) => console.error('[supervision] exception notice:', error))
    sendSuccess(res, row, 'تم نقل الحالة مع حفظ المسؤول السابق في سجل التغييرات')
  } catch (error) { next(error) }
}

exports.requestAdjustment = async (req, res, next) => {
  try {
    if (!administrative(req.user)) return sendError(res, 'غير مصرح', 403)
    const { sessionId, accountType } = req.body || {}
    const reason = text(req.body?.reason)
    const amount = Number(req.body?.amount)
    if (!validId(sessionId) || !['teacher_payroll', 'student_lessons'].includes(accountType) || !reason || !Number.isFinite(amount) || amount <= 0 || amount > 100000 || accountType === 'student_lessons' && !Number.isInteger(amount) || accountType === 'teacher_payroll' && Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) return sendError(res, 'بيانات الخصم غير صالحة', 400)
    const session = await Session.findById(sessionId).select('teacherId supervisionOriginalTeacherId studentId scheduledAt').lean()
    if (!session) return sendError(res, 'الحصة غير موجودة', 404)
    if (!await assigned(req.user, 'administrative', [session.teacherId, session.supervisionOriginalTeacherId].filter(Boolean), session.scheduledAt)) return sendError(res, 'غير مكلف بهذه الحصة', 403)
    const row = await Adjustment.create({ sessionId, teacherId: session.teacherId, supervisionTeacherId: session.supervisionOriginalTeacherId || session.teacherId, sessionScheduledAt: session.scheduledAt, accountType, accountOwnerId: accountType === 'teacher_payroll' ? session.teacherId : session.studentId,
      unit: accountType === 'teacher_payroll' ? 'EGP' : 'lesson', requestedAmount: amount, reason, requestedBy: req.user._id })
    const managers = await User.find({ isActive: true, supervisionTeam: 'administrative', supervisionPosition: 'manager' }).select('_id').lean()
    await createNotifications(managers.map((person) => ({ userId: person._id, type: 'assignment', titleAr: 'طلب خصم ينتظر القرار', bodyAr: `${amount} ${row.unit} — ${reason}`, actionUrl: '/admin/supervision/administrative-manager', metadata: { dedupeKey: `adjustment-request:${row._id}` } }))).catch((error) => console.error('[supervision] adjustment notice:', error))
    await audit(req, 'supervision_adjustment_request', 'SupervisionAdjustmentRequest', row._id, { sessionId, accountType, amount })
    sendSuccess(res, row, 'تم رفع الطلب للمدير دون تغيير الرصيد', 201)
  } catch (error) { next(error) }
}

exports.listAdjustments = async (req, res, next) => {
  try {
    if (!administrative(req.user)) return sendError(res, 'غير مصرح', 403)
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
    const filter = {}
    if (req.query.status && ['pending', 'processing', 'approved', 'rejected', 'bonus'].includes(req.query.status)) filter.status = req.query.status
    if (!admin(req.user)) {
      if (manager(req.user)) {
        const assignments = await Assignment.find({ team: 'administrative' }).select('teacherId').lean()
        filter.supervisionTeacherId = { $in: [...new Set(assignments.map((row) => id(row.teacherId)))] }
      } else filter.requestedBy = req.user._id
    }
    const [rows, total] = await Promise.all([
      Adjustment.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('accountOwnerId', 'firstNameAr lastNameAr').populate('requestedBy', 'firstNameAr lastNameAr').populate('sessionId', 'titleAr scheduledAt').lean(),
      Adjustment.countDocuments(filter),
    ])
    sendPaginated(res, rows, total, page, limit)
  } catch (error) { next(error) }
}

exports.decideAdjustment = async (req, res, next) => {
  try {
    if (!manager(req.user) || !validId(req.params.id)) return sendError(res, 'قرار الخصم لمدير الإشراف الإداري أو الإدارة العامة', 403)
    const decision = req.body?.decision
    const reason = text(req.body?.reason)
    if (!['approve', 'reject', 'bonus'].includes(decision) || !reason) return sendError(res, 'القرار وسببه مطلوبان', 400)
    const row = await Adjustment.findById(req.params.id)
    if (!row) return sendError(res, 'الطلب غير موجود', 404)
    if (!admin(req.user) && !await assigned(req.user, 'administrative', row.supervisionTeacherId || row.teacherId, row.sessionScheduledAt)) return sendError(res, 'الطلب خارج فريقك', 403)
    if (row.status !== 'pending') return sendError(res, 'تم اتخاذ قرار لهذا الطلب بالفعل', 409)
    const amount = decision === 'reject' ? 0 : req.body.amount === undefined ? row.requestedAmount : Number(req.body.amount)
    if (decision !== 'reject' && (!Number.isFinite(amount) || amount <= 0 || amount > 100000 || row.unit === 'lesson' && !Number.isInteger(amount) || row.unit === 'EGP' && Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)) return sendError(res, 'القيمة المعتمدة غير صالحة', 400)
    const locked = await Adjustment.findOneAndUpdate({ _id: row._id, status: 'pending' }, { $set: { status: 'processing', decision, decidedAmount: amount, decisionReason: reason, decidedBy: req.user._id, decidedAt: new Date() } }, { new: true })
    if (!locked) return sendError(res, 'الطلب قيد المعالجة بالفعل', 409)
    try {
      await finishAdjustment(req, locked)
      sendSuccess(res, locked, 'تم تسجيل القرار وأثره المالي مرة واحدة')
    } catch (error) {
      locked.processingError = String(error.message || 'تعذر تنفيذ القرار').slice(0, 500)
      await locked.save()
      if (error.status) return sendError(res, error.message, error.status)
      next(error)
    }
  } catch (error) { next(error) }
}

async function finishAdjustment(req, locked) {
  const decision = locked.decision
  const reason = locked.decisionReason
  const amount = locked.decidedAmount
  if (decision === 'reject') locked.status = 'rejected'
      else if (locked.accountType === 'student_lessons') {
        const { transaction } = await wallet.applyTransaction({ studentId: locked.accountOwnerId, type: decision === 'bonus' ? 'bonus' : 'manual_adjustment', amount: decision === 'bonus' ? amount : -amount,
          idempotencyKey: `supervision-adjustment:${locked._id}`, reason: `${locked.reason} — قرار المدير: ${reason}`, relatedSessionId: locked.sessionId, performedByRole: 'admin', performedBy: locked.decidedBy })
        locked.walletTransactionId = transaction._id; locked.status = decision === 'bonus' ? 'bonus' : 'approved'
      } else {
        const { entry } = await financial.createTeacherAdjustment({ teacherId: locked.accountOwnerId, type: decision === 'bonus' ? 'bonus' : 'penalty', amount,
          reason: `${locked.reason} — قرار المدير: ${reason}`, createdBy: locked.decidedBy, idempotencyKey: `supervision-adjustment:${locked._id}` })
        locked.ledgerEntryId = entry._id; locked.status = decision === 'bonus' ? 'bonus' : 'approved'
      }
  locked.processingError = undefined
  await locked.save()
  await audit(req, `supervision_adjustment_${decision}`, 'SupervisionAdjustmentRequest', locked._id, { amount, unit: locked.unit, accountType: locked.accountType })
  await createNotification({ userId: locked.requestedBy, type: 'assignment', titleAr: 'صدر قرار طلب الخصم', bodyAr: `القرار: ${decision} — ${reason}`, actionUrl: '/admin/supervision/administrative' }).catch(() => {})
}

exports.retryAdjustment = async (req, res, next) => {
  try {
    if (!manager(req.user) || !validId(req.params.id)) return sendError(res, 'غير مصرح', 403)
    const row = await Adjustment.findById(req.params.id)
    if (!row || row.status !== 'processing' || !row.decision) return sendError(res, 'لا يوجد قرار معلق لإعادة المحاولة', 409)
    if (!admin(req.user) && !await assigned(req.user, 'administrative', row.supervisionTeacherId || row.teacherId, row.sessionScheduledAt)) return sendError(res, 'الطلب خارج فريقك', 403)
    if (new Date() - row.updatedAt < 60000) return sendError(res, 'انتظر دقيقة للتأكد من انتهاء المحاولة السابقة', 409)
    try {
      await finishAdjustment(req, row)
      sendSuccess(res, row, 'اكتمل القرار دون تكرار الأثر')
    } catch (error) {
      row.processingError = String(error.message || 'تعذر تنفيذ القرار').slice(0, 500)
      await row.save()
      if (error.status) return sendError(res, error.message, error.status)
      next(error)
    }
  } catch (error) { next(error) }
}

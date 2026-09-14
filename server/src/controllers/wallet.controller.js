const Subscription = require('../models/Subscription')
const User = require('../models/User')
const walletService = require('../services/wallet.service')
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const { createNotification } = require('../services/notification.service')

async function notifyTeacherOfStudentAdjustment(studentId, { titleAr, bodyAr }) {
  try {
    const activeSub = await Subscription.findOne({ studentId, status: 'active' }).select('teacherId')
    if (activeSub?.teacherId) {
      await createNotification({
        userId: activeSub.teacherId,
        titleAr,
        bodyAr,
        type: 'subscription',
        priority: 'medium',
        actionUrl: `/teacher/students/${studentId}`,
      })
    }
  } catch (_) {
    // Non-critical notification failure — never block the main transaction
  }
}

async function notifyAdmins({ titleAr, bodyAr, actionUrl }) {
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').limit(20)
    await Promise.all(
      admins.map(a =>
        createNotification({
          userId: a._id,
          titleAr,
          bodyAr,
          type: 'subscription',
          priority: 'medium',
          actionUrl,
        }).catch(() => {})
      )
    )
  } catch (_) {
    // Non-critical admin notification failure
  }
}

async function isAssignedTeacher(teacherId, studentId) {
  const link = await Subscription.exists({ studentId, teacherId })
  return !!link
}

async function assertCanView(req, studentId) {
  if (req.user.role === 'admin') return true
  if (req.user.role === 'teacher') return isAssignedTeacher(req.user._id, studentId)
  return false
}

exports.getMyWallet = async (req, res, next) => {
  try {
    const wallet = await walletService.getOrCreateWallet(req.user._id)
    const { transactions } = await walletService.getTransactions(req.user._id, { page: 1, limit: 20 })
    sendSuccess(res, { wallet, transactions })
  } catch (err) { next(err) }
}

exports.getStudentWallet = async (req, res, next) => {
  try {
    if (!(await assertCanView(req, req.params.studentId))) return sendError(res, 'غير مصرح', 403)
    const wallet = await walletService.getOrCreateWallet(req.params.studentId)
    sendSuccess(res, wallet)
  } catch (err) { next(err) }
}

exports.getStudentTransactions = async (req, res, next) => {
  try {
    if (!(await assertCanView(req, req.params.studentId))) return sendError(res, 'غير مصرح', 403)
    const result = await walletService.getTransactions(req.params.studentId, { page: req.query.page, limit: req.query.limit })
    sendSuccess(res, result)
  } catch (err) { next(err) }
}

// Admin: manual balance adjustment — always goes through the wallet ledger
// (never a raw number overwrite), so it's auditable like everything else.
exports.adjustWallet = async (req, res, next) => {
  try {
    const { amount, reason } = req.body
    const numAmount = Number(amount)
    if (!numAmount || Number.isNaN(numAmount)) return sendError(res, 'الكمية مطلوبة', 400)
    if (!reason || !reason.trim()) return sendError(res, 'سبب التعديل مطلوب', 400)

    const { transaction, wallet } = await walletService.applyTransaction({
      studentId: req.params.studentId, type: 'manual_adjustment', amount: numAmount,
      reason: reason.trim(), performedByRole: 'admin', performedBy: req.user._id,
    })

    const isDeduction = numAmount < 0
    const absAmount = Math.abs(numAmount)
    const unitWord = absAmount === 1 ? 'حصة' : 'حصص'

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: isDeduction ? 'wallet.deduction' : 'wallet.manual_adjustment',
      entity: 'LessonWallet', entityId: wallet._id, changes: { amount: numAmount, reason }, ip: req.ip,
    })

    const student = await User.findById(req.params.studentId).select('firstNameAr lastNameAr').catch(() => null)
    const sName = student ? `${student.firstNameAr || ''} ${student.lastNameAr || ''}`.trim() : 'الطالب'

    // Notify Student
    await createNotification({
      userId: req.params.studentId,
      titleAr: isDeduction ? 'خصم حصص من رصيدك' : 'إضافة حصص إلى رصيدك',
      bodyAr: isDeduction
        ? `تم خصم ${absAmount} ${unitWord} من رصيدك من قِبل الإدارة — السبب: ${reason.trim()} (رصيدك الحالي: ${wallet.remaining} حصة)`
        : `تمت إضافة ${absAmount} ${unitWord} إلى رصيدك من قِبل الإدارة — السبب: ${reason.trim()} (رصيدك الحالي: ${wallet.remaining} حصة)`,
      type: 'subscription',
      priority: isDeduction ? 'high' : 'medium',
      actionUrl: '/student/subscription',
    }).catch(() => {})

    // Notify Assigned Teacher
    await notifyTeacherOfStudentAdjustment(req.params.studentId, {
      titleAr: isDeduction ? 'خصم حصص من رصيد طالبك' : 'إضافة حصص لرصيد طالبك',
      bodyAr: isDeduction
        ? `تم خصم ${absAmount} ${unitWord} من رصيد الطالب (${sName}) — السبب: ${reason.trim()} (الرصيد المتبقي: ${wallet.remaining} حصة)`
        : `تمت إضافة ${absAmount} ${unitWord} إلى رصيد الطالب (${sName}) — السبب: ${reason.trim()} (الرصيد المتبقي: ${wallet.remaining} حصة)`,
    })

    // Notify Admins
    await notifyAdmins({
      titleAr: isDeduction ? `خصم رصيد لطالب: ${sName}` : `إضافة رصيد لطالب: ${sName}`,
      bodyAr: `تم ${isDeduction ? 'خصم' : 'إضافة'} ${absAmount} ${unitWord} ${isDeduction ? 'من' : 'إلى'} رصيد الطالب (${sName}) — السبب: ${reason.trim()} (الرصيد المتبقي: ${wallet.remaining} حصة)`,
      actionUrl: `/admin/students/${req.params.studentId}`,
    })

    sendSuccess(res, { wallet, transaction }, isDeduction ? 'تم خصم الحصص وتحديث المحفظة بنجاح' : 'تم تعديل الرصيد وتحديث المحفظة بنجاح')
  } catch (err) { next(err) }
}

exports.freezeWallet = async (req, res, next) => {
  try {
    const { reason, resumeAt } = req.body
    if (!reason || !reason.trim()) return sendError(res, 'سبب التجميد مطلوب', 400)
    const wallet = await walletService.freezeWallet(req.params.studentId, { reason: reason.trim(), resumeAt, frozenBy: req.user._id })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'wallet.freeze',
      entity: 'LessonWallet', entityId: wallet._id, changes: { reason, resumeAt }, ip: req.ip,
    })
    await createNotification({
      userId: req.params.studentId, titleAr: 'تم تجميد رصيد حصصك',
      bodyAr: `تم تجميد رصيد حصصك مؤقتاً — ${reason}`, type: 'subscription', priority: 'high', actionUrl: '/student/subscription',
    })

    sendSuccess(res, wallet, 'تم تجميد المحفظة')
  } catch (err) { next(err) }
}

exports.resumeWallet = async (req, res, next) => {
  try {
    const wallet = await walletService.resumeWallet(req.params.studentId, { resumedBy: req.user._id })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'wallet.resume',
      entity: 'LessonWallet', entityId: wallet._id, ip: req.ip,
    })
    await createNotification({
      userId: req.params.studentId, titleAr: 'تم إلغاء تجميد رصيد حصصك',
      bodyAr: 'أصبح بإمكانك حجوز حصص جديدة مرة أخرى', type: 'subscription', priority: 'medium', actionUrl: '/student/subscription',
    })

    sendSuccess(res, wallet, 'تم إلغاء تجميد المحفظة')
  } catch (err) { next(err) }
}

// Admin: move lessons from one student's wallet to another's (e.g. siblings).
exports.transferLessons = async (req, res, next) => {
  try {
    const { toStudentId, amount, reason } = req.body
    const numAmount = Math.abs(Number(amount))
    if (!toStudentId || !numAmount) return sendError(res, 'الطالب المستلم والكمية مطلوبة', 400)
    if (toStudentId === req.params.studentId) return sendError(res, 'لا يمكن التحويل لنفس الطالب', 400)

    const fromResult = await walletService.applyTransaction({
      studentId: req.params.studentId, type: 'transfer_out', amount: -numAmount,
      relatedStudentId: toStudentId, reason, performedByRole: 'admin', performedBy: req.user._id,
    })
    await walletService.applyTransaction({
      studentId: toStudentId, type: 'transfer_in', amount: numAmount,
      relatedStudentId: req.params.studentId, reason, performedByRole: 'admin', performedBy: req.user._id,
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'wallet.transfer',
      entity: 'LessonWallet', entityId: fromResult.wallet._id,
      changes: { toStudentId, amount: numAmount, reason }, ip: req.ip,
    })

    sendSuccess(res, null, 'تم تحويل الحصص بنجاح')
  } catch (err) { next(err) }
}

// Admin: grant a bonus lesson (a goodwill/incentive credit — distinct from a
// compensation lesson, which specifically offsets a teacher-side disruption;
// see grantCompensation below). Reuses wallet.service's existing 'bonus'
// transaction type, which was already tracked on LessonWallet.bonusLessons
// but had no admin-facing endpoint until this pass.
exports.grantBonus = async (req, res, next) => {
  try {
    const { amount, reason } = req.body
    const numAmount = Math.max(1, Number(amount) || 1)
    if (!reason || !reason.trim()) return sendError(res, 'سبب حصة المكافأة مطلوب', 400)

    const { transaction, wallet } = await walletService.applyTransaction({
      studentId: req.params.studentId, type: 'bonus', amount: numAmount,
      reason: reason.trim(), performedByRole: 'admin', performedBy: req.user._id,
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'wallet.bonus_grant',
      entity: 'LessonWallet', entityId: wallet._id, changes: { amount: numAmount, reason }, ip: req.ip,
    })
    // Notify Student
    await createNotification({
      userId: req.params.studentId,
      titleAr: 'حصة مكافأة مضافة',
      bodyAr: `تمت إضافة ${numAmount} ${numAmount === 1 ? 'حصة مكافأة' : 'حصص مكافأة'} إلى رصيدك من قِبل الإدارة — السبب: ${reason.trim()} (رصيدك الحالي: ${wallet.remaining} حصة)`,
      type: 'subscription',
      priority: 'medium',
      actionUrl: '/student/subscription',
    }).catch(() => {})

    const studentBonus = await User.findById(req.params.studentId).select('firstNameAr lastNameAr').catch(() => null)
    const sNameBonus = studentBonus ? `${studentBonus.firstNameAr || ''} ${studentBonus.lastNameAr || ''}`.trim() : 'الطالب'

    // Notify Teacher
    await notifyTeacherOfStudentAdjustment(req.params.studentId, {
      titleAr: 'إضافة حصة مكافأة لطالبك',
      bodyAr: `تمت إضافة ${numAmount} ${numAmount === 1 ? 'حصة مكافأة' : 'حصص مكافأة'} إلى رصيد الطالب (${sNameBonus}) — السبب: ${reason.trim()} (الرصيد المتبقي: ${wallet.remaining} حصة)`,
    })

    // Notify Admins
    await notifyAdmins({
      titleAr: `منح حصص مكافأة: ${sNameBonus}`,
      bodyAr: `تم منح ${numAmount} حصة مكافأة للطالب (${sNameBonus}) — السبب: ${reason.trim()}`,
      actionUrl: `/admin/students/${req.params.studentId}`,
    })

    sendSuccess(res, { wallet, transaction }, 'تم منح حصة المكافأة بنجاح')
  } catch (err) { next(err) }
}

// Admin: manually grant a compensation lesson, independent of an automatic
// teacher-cancellation/no-show trigger (see compensation.service.js).
exports.grantCompensation = async (req, res, next) => {
  try {
    const { amount, reason } = req.body
    const numAmount = Math.max(1, Number(amount) || 1)
    if (!reason || !reason.trim()) return sendError(res, 'سبب الحصة التعويضية مطلوب', 400)

    const { transaction, wallet } = await walletService.applyTransaction({
      studentId: req.params.studentId, type: 'compensation', amount: numAmount,
      reason: reason.trim(), performedByRole: 'admin', performedBy: req.user._id,
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'wallet.compensation_grant',
      entity: 'LessonWallet', entityId: wallet._id, changes: { amount: numAmount, reason }, ip: req.ip,
    })

    // Notify Student
    await createNotification({
      userId: req.params.studentId,
      titleAr: 'حصة تعويضية مضافة',
      bodyAr: `تمت إضافة ${numAmount} ${numAmount === 1 ? 'حصة تعويضية' : 'حصص تعويضية'} إلى رصيدك من قِبل الإدارة — السبب: ${reason.trim()} (رصيدك الحالي: ${wallet.remaining} حصة)`,
      type: 'subscription',
      priority: 'medium',
      actionUrl: '/student/subscription',
    }).catch(() => {})

    const studentComp = await User.findById(req.params.studentId).select('firstNameAr lastNameAr').catch(() => null)
    const sNameComp = studentComp ? `${studentComp.firstNameAr || ''} ${studentComp.lastNameAr || ''}`.trim() : 'الطالب'

    // Notify Teacher
    await notifyTeacherOfStudentAdjustment(req.params.studentId, {
      titleAr: 'إضافة حصة تعويضية لطالبك',
      bodyAr: `تمت إضافة ${numAmount} ${numAmount === 1 ? 'حصة تعويضية' : 'حصص تعويضية'} إلى رصيد الطالب (${sNameComp}) — السبب: ${reason.trim()} (الرصيد المتبقي: ${wallet.remaining} حصة)`,
    })

    // Notify Admins
    await notifyAdmins({
      titleAr: `منح حصص تعويضية: ${sNameComp}`,
      bodyAr: `تم منح ${numAmount} حصة تعويضية للطالب (${sNameComp}) — السبب: ${reason.trim()}`,
      actionUrl: `/admin/students/${req.params.studentId}`,
    })

    sendSuccess(res, { wallet, transaction }, 'تم منح الحصة التعويضية بنجاح')
  } catch (err) { next(err) }
}

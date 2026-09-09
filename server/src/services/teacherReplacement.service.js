// Bulk whole-teacher-replacement (Phase 2 meeting addendum §4) — e.g. a
// teacher leaving the academy. Reuses transfer.service.js's single-student
// executeStudentTransfer as the ONLY primitive that actually moves a
// student; this file is purely about classifying, batching, and driving
// that primitive over many students with per-student isolation, bounded
// processing, and resumability — never a second transfer implementation.
const User = require('../models/User')
const Subscription = require('../models/Subscription')
const ScheduleRule = require('../models/ScheduleRule')
const TeacherReplacementBatch = require('../models/TeacherReplacementBatch')
const transferService = require('./transfer.service')
const { logAction } = require('./audit.service')
const { createNotifications } = require('./notification.service')

// Bounded per-call processing — keeps a single HTTP request from running
// unboundedly long on a very large academy; the remaining entries stay
// 'pending' and a subsequent call to runBatch (the UI's "متابعة" action)
// resumes exactly where this call left off. No new job-queue infrastructure
// is introduced since none exists elsewhere in this codebase — this bounded-
// resumable-call pattern achieves the same safety property without one.
const MAX_ENTRIES_PER_RUN = 100

class TeacherReplacementError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

async function classifyStudentsForReplacement(sourceTeacherId, targetTeacherId) {
  const subscriptions = await Subscription.find({ teacherId: sourceTeacherId, status: 'active' })
  const entries = []
  const seenStudents = new Set()

  for (const sub of subscriptions) {
    const sId = String(sub.studentId)
    if (seenStudents.has(sId)) continue
    seenStudents.add(sId)

    const rules = await ScheduleRule.find({ studentId: sub.studentId, teacherId: sourceTeacherId, status: 'active' })
    if (!rules.length) {
      entries.push({
        studentId: sub.studentId, subscriptionId: sub._id,
        classification: 'missing_data', classificationReason: 'لا يوجد جدول دوري نشط لهذا الطالب لدى المعلم الحالي',
      })
      continue
    }
    const resolution = await transferService.computeScheduleResolution({
      studentId: sub.studentId, targetTeacherId, oldRules: rules,
    })
    const conflictingRuleIds = resolution.filter((r) => !r.valid).map((r) => r.rule._id)
    entries.push({
      studentId: sub.studentId, subscriptionId: sub._id,
      classification: conflictingRuleIds.length ? 'conflict' : 'ready',
      classificationReason: conflictingRuleIds.length ? 'يوجد تعارض في موعد واحد أو أكثر مع المعلم الجديد' : undefined,
      // Persisted so runBatch can require a resolution for EVERY conflicting
      // rule (a student can have more than one simultaneously-conflicting
      // rule, each needing its own alternative — see setEntryResolution).
      conflictingRuleIds,
      _resolution: resolution, // internal only — not persisted on the entry, used to build the preview response
    })
  }
  return entries
}

/**
 * Preview-only — classifies every active student of the source teacher
 * against the target teacher's real availability, without writing anything.
 */
async function previewTeacherReplacement(sourceTeacherId, targetTeacherId) {
  const [sourceTeacher, targetTeacher] = await Promise.all([
    User.findOne({ _id: sourceTeacherId, role: 'teacher' }),
    transferService.assertTargetTeacherValid(targetTeacherId, sourceTeacherId),
  ])
  if (!sourceTeacher) throw new TeacherReplacementError('المعلم المصدر غير موجود', 404, 'sourceTeacherId')

  const entries = await classifyStudentsForReplacement(sourceTeacherId, targetTeacherId)
  const students = await User.find({ _id: { $in: entries.map((e) => e.studentId) } }).select('firstNameAr lastNameAr email phone avatar')
  const byId = new Map(students.map((s) => [String(s._id), s]))

  const sourceStudentCount = typeof Subscription.countDocuments === 'function'
    ? await Subscription.countDocuments({ teacherId: sourceTeacherId, status: 'active' }).catch(() => 0)
    : 0
  const targetStudentCount = typeof Subscription.countDocuments === 'function'
    ? await Subscription.countDocuments({ teacherId: targetTeacherId, status: 'active' }).catch(() => 0)
    : 0

  const sourcePub = sourceTeacher.toPublic()
  sourcePub.activeStudentCount = sourceStudentCount
  const targetPub = targetTeacher.toPublic()
  targetPub.activeStudentCount = targetStudentCount

  return {
    sourceTeacher: sourcePub, targetTeacher: targetPub,
    entries: entries.map((e) => ({
      ...e, student: byId.get(String(e.studentId))?.toPublic() || null,
      scheduleResolution: e._resolution?.map((r) => ({
        ruleId: r.rule._id, days: r.days, valid: r.valid, conflicts: r.conflicts, alternatives: r.alternatives,
      })),
    })),
    summary: {
      total: entries.length,
      ready: entries.filter((e) => e.classification === 'ready').length,
      conflict: entries.filter((e) => e.classification === 'conflict').length,
      missingData: entries.filter((e) => e.classification === 'missing_data').length,
    },
  }
}

/**
 * Creates the batch record (status: 'draft') — re-classifies fresh (never
 * trusts a stale client-held preview) and stores only the students the
 * admin actually selected to include.
 */
async function createBatch(sourceTeacherId, targetTeacherId, { reason, effectiveDate, studentIds, deactivateSourceTeacherOnSuccess, actorId }) {
  if (!reason?.trim()) throw new TeacherReplacementError('سبب الاستبدال مطلوب', 400, 'reason')
  if (!actorId) throw new TeacherReplacementError('منفذ العملية مطلوب', 400)
  const effective = effectiveDate ? new Date(effectiveDate) : new Date()
  if (Number.isNaN(effective.getTime())) throw new TeacherReplacementError('تاريخ السريان غير صالح', 400, 'effectiveDate')

  await User.findOne({ _id: sourceTeacherId, role: 'teacher' }).then((t) => {
    if (!t) throw new TeacherReplacementError('المعلم المصدر غير موجود', 404, 'sourceTeacherId')
  })
  await transferService.assertTargetTeacherValid(targetTeacherId, sourceTeacherId)

  const classified = await classifyStudentsForReplacement(sourceTeacherId, targetTeacherId)
  const selectedSet = Array.isArray(studentIds) ? new Set(studentIds.map(String)) : null

  const entries = classified.map((e) => ({
    studentId: e.studentId, subscriptionId: e.subscriptionId,
    classification: e.classification, classificationReason: e.classificationReason,
    conflictingRuleIds: e.conflictingRuleIds || [],
    selected: e.classification !== 'missing_data' && (selectedSet ? selectedSet.has(String(e.studentId)) : true),
    resolvedSchedule: [], result: 'pending',
  }))

  const batch = await TeacherReplacementBatch.create({
    sourceTeacherId, targetTeacherId, reason: reason.trim(), effectiveDate: effective,
    status: 'draft', entries, deactivateSourceTeacherOnSuccess: !!deactivateSourceTeacherOnSuccess, createdBy: actorId,
  })

  logAction({
    actorId, actorRole: 'admin', action: 'teacherReplacement.create_batch',
    entity: 'TeacherReplacementBatch', entityId: batch._id,
    changes: { sourceTeacherId, targetTeacherId, studentCount: entries.filter((e) => e.selected).length },
  })

  return batch
}

/**
 * Sets/overrides the resolved alternative slot(s) for one 'conflict' entry
 * before it can run. Each item may name a `ruleId` — a student with more
 * than one simultaneously-conflicting rule gets each resolved to its own
 * alternative, upserted independently (previously every conflicting rule
 * for a student was forced onto the same single alternative; now each rule
 * keeps whatever the admin picked for it). An item with no `ruleId` is kept
 * as a blanket fallback applied to any rule that has no more-specific
 * per-rule decision — this preserves the common single-conflict UI flow
 * (pick one slot, done) without requiring the caller to always name a rule.
 */
async function setEntryResolution(batchId, studentId, resolvedScheduleItems) {
  const batch = await TeacherReplacementBatch.findById(batchId)
  if (!batch) throw new TeacherReplacementError('الدفعة غير موجودة', 404)
  const entry = batch.entries.find((e) => String(e.studentId) === String(studentId))
  if (!entry) throw new TeacherReplacementError('الطالب غير موجود في هذه الدفعة', 404)

  const items = Array.isArray(resolvedScheduleItems) ? resolvedScheduleItems : []
  items.forEach((item) => {
    const idx = entry.resolvedSchedule.findIndex((d) => (
      item.ruleId ? d.ruleId && String(d.ruleId) === String(item.ruleId) : !d.ruleId
    ))
    const next = { ruleId: item.ruleId || undefined, dayOfWeek: item.dayOfWeek, time: item.time }
    // .splice/.push (not direct index assignment) so Mongoose's DocumentArray
    // correctly marks resolvedSchedule as modified before batch.save().
    if (idx >= 0) entry.resolvedSchedule.splice(idx, 1, next)
    else entry.resolvedSchedule.push(next)
  })
  await batch.save()
  return batch
}

async function loadBatch(batchId) {
  const batch = await TeacherReplacementBatch.findById(batchId)
  if (!batch) throw new TeacherReplacementError('الدفعة غير موجودة', 404)
  return batch
}

/**
 * Display variant of loadBatch for the review/monitoring screen — attaches
 * each entry's real student name the same way previewTeacherReplacement
 * does, without touching entry.studentId itself (kept as a raw ObjectId;
 * every mutation endpoint — resolution/run/retry/cancel — matches on it as
 * a string, and populating it in place would break those comparisons). This
 * fixes the review page falling back to a partial-id label ("طالب #xxxxxx")
 * because the raw batch document never carried the student's name.
 */
async function loadBatchForDisplay(batchId) {
  const batch = await loadBatch(batchId)
  const students = await User.find({ _id: { $in: batch.entries.map((e) => e.studentId) } }).select('firstNameAr lastNameAr email')
  const byId = new Map(students.map((s) => [String(s._id), s]))
  const obj = batch.toObject()
  obj.entries = obj.entries.map((e) => ({ ...e, student: byId.get(String(e.studentId))?.toPublic() || null }))
  return obj
}

/**
 * Processes up to MAX_ENTRIES_PER_RUN still-'pending' selected entries,
 * calling transfer.service's canonical primitive for each — isolated
 * per-student (one failure never stops or corrupts the rest), idempotent
 * (each call's idempotencyKey makes a retried entry a safe no-op), and
 * resumable (call again to continue past the bound, or to pick up entries
 * left 'pending' after this call).
 */
async function runBatch(batchId, { actorId }) {
  const batch = await loadBatch(batchId)
  // Idempotent no-op — a duplicate/retried "run" request (double-click,
  // network retry) against an already-terminal batch must never surface a
  // scary error; it just returns the batch exactly as it already stands.
  if (['completed', 'cancelled', 'failed'].includes(batch.status)) return batch

  if (batch.status === 'draft') { batch.status = 'running'; batch.startedAt = new Date() }

  const pendingEntries = batch.entries.filter((e) => e.selected && e.result === 'pending')
  const toProcess = pendingEntries.slice(0, MAX_ENTRIES_PER_RUN)

  for (const entry of toProcess) {
    try {
      if (entry.classification === 'conflict') {
        // Every conflicting rule this student has must have its own
        // resolution — either a per-rule decision (ruleId matches) or a
        // blanket one (no ruleId, applies to any rule left unresolved).
        const resolvedRuleIds = new Set(entry.resolvedSchedule.filter((d) => d.ruleId).map((d) => String(d.ruleId)))
        const hasBlanket = entry.resolvedSchedule.some((d) => !d.ruleId)
        const requiredIds = (entry.conflictingRuleIds || []).map(String)
        const allResolved = requiredIds.length
          ? requiredIds.every((id) => resolvedRuleIds.has(id) || hasBlanket)
          : entry.resolvedSchedule.length > 0
        if (!allResolved) {
          entry.result = 'failed'
          entry.errorMessage = 'لم يتم اختيار موعد بديل لكل مواعيد هذا الطالب المتعارضة قبل التشغيل'
          entry.processedAt = new Date()
          continue
        }
      }
      const scheduleDecisions = {}
      if (entry.resolvedSchedule?.length) {
        // Each active rule gets its own per-rule decision when the admin
        // named one (ruleId match); otherwise falls back to the blanket
        // decision, if any — see setEntryResolution's doc-comment. A student
        // with multiple simultaneously-conflicting rules can now get a
        // DIFFERENT alternative for each, resolved right here in the batch.
        const rules = await ScheduleRule.find({ studentId: entry.studentId, teacherId: batch.sourceTeacherId, status: 'active' })
        const blanket = entry.resolvedSchedule.find((d) => !d.ruleId)
        rules.forEach((r) => {
          const perRule = entry.resolvedSchedule.find((d) => d.ruleId && String(d.ruleId) === String(r._id))
          const decision = perRule || blanket
          if (decision) scheduleDecisions[String(r._id)] = { dayOfWeek: decision.dayOfWeek, time: decision.time }
        })
      }

      const { transfer } = await transferService.executeStudentTransfer(entry.studentId, {
        targetTeacherId: batch.targetTeacherId, effectiveDate: batch.effectiveDate, reason: batch.reason,
        scheduleDecisions, actorId, batchId: batch._id, idempotencyKey: `${entry.studentId}:${batch._id}`,
      })
      entry.result = 'success'
      entry.transferId = transfer._id
      entry.processedAt = new Date()
    } catch (err) {
      entry.result = 'failed'
      entry.errorMessage = err.message || 'فشل غير معروف'
      entry.processedAt = new Date()
    }
  }

  const selectedEntries = batch.entries.filter((e) => e.selected)
  const stillPending = selectedEntries.some((e) => e.result === 'pending')
  const anyFailed = selectedEntries.some((e) => e.result === 'failed')
  const anySuccess = selectedEntries.some((e) => e.result === 'success')

  if (!stillPending) {
    batch.completedAt = new Date()
    batch.status = anyFailed ? (anySuccess ? 'partial' : 'failed') : 'completed'

    if (batch.status === 'completed' && batch.deactivateSourceTeacherOnSuccess) {
      await User.updateOne({ _id: batch.sourceTeacherId }, { $set: { isActive: false } })
      batch.sourceTeacherDeactivated = true
      logAction({
        actorId, actorRole: 'admin', action: 'teacherReplacement.deactivate_source_teacher',
        entity: 'User', entityId: batch.sourceTeacherId, changes: { batchId: batch._id },
      })
    }
  }

  await batch.save()

  logAction({
    actorId, actorRole: 'admin', action: 'teacherReplacement.run_batch',
    entity: 'TeacherReplacementBatch', entityId: batch._id,
    changes: { processed: toProcess.length, status: batch.status },
  })

  if (!stillPending) await notifyBatchComplete(batch)

  return batch
}

async function retryBatch(batchId, { actorId }) {
  const batch = await loadBatch(batchId)
  let resetCount = 0
  batch.entries.forEach((e) => {
    if (e.selected && e.result === 'failed') { e.result = 'pending'; e.errorMessage = undefined; resetCount++ }
  })
  if (!resetCount) throw new TeacherReplacementError('لا توجد عناصر فاشلة لإعادة المحاولة', 409)
  batch.status = 'running'
  await batch.save()
  logAction({ actorId, actorRole: 'admin', action: 'teacherReplacement.retry_batch', entity: 'TeacherReplacementBatch', entityId: batch._id, changes: { resetCount } })
  return runBatch(batchId, { actorId })
}

async function cancelBatch(batchId, { actorId }) {
  const batch = await loadBatch(batchId)
  if (['completed', 'cancelled'].includes(batch.status)) {
    throw new TeacherReplacementError('لا يمكن إلغاء دفعة مكتملة أو ملغاة بالفعل', 409)
  }
  batch.entries.forEach((e) => { if (e.result === 'pending') e.result = 'skipped' })
  batch.status = 'cancelled'
  batch.completedAt = new Date()
  await batch.save()
  logAction({ actorId, actorRole: 'admin', action: 'teacherReplacement.cancel_batch', entity: 'TeacherReplacementBatch', entityId: batch._id })
  return batch
}

async function listBatches({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit
  const [batches, total] = await Promise.all([
    TeacherReplacementBatch.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('sourceTeacherId', 'firstNameAr lastNameAr').populate('targetTeacherId', 'firstNameAr lastNameAr'),
    TeacherReplacementBatch.countDocuments(),
  ])
  return { batches, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
}

async function notifyBatchComplete(batch) {
  const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').limit(20)
  const successCount = batch.entries.filter((e) => e.result === 'success').length
  const failedCount = batch.entries.filter((e) => e.result === 'failed').length
  const notifications = admins.map((a) => ({
    userId: a._id, titleAr: 'اكتملت دفعة استبدال المعلم',
    bodyAr: `نجح نقل ${successCount} طالب${failedCount ? `، وفشل ${failedCount}` : ''}`,
    type: 'schedule', priority: failedCount ? 'high' : 'medium', actionUrl: `/admin/teachers/replace/${batch._id}`, relatedId: batch._id,
  }))
  const targetTeacher = await User.findById(batch.targetTeacherId).select('_id')
  if (targetTeacher) {
    notifications.push({
      userId: targetTeacher._id, titleAr: 'اكتمل استبدال معلم — طلاب جدد',
      bodyAr: `تم إسناد ${successCount} طالب جديد إلى حلقاتك`,
      type: 'schedule', priority: 'medium', actionUrl: '/teacher/students', relatedId: batch._id,
    })
  }
  await createNotifications(notifications).catch(() => {})
}

module.exports = {
  previewTeacherReplacement, createBatch, setEntryResolution, runBatch, retryBatch, cancelBatch,
  listBatches, loadBatch, loadBatchForDisplay, TeacherReplacementError, MAX_ENTRIES_PER_RUN,
}

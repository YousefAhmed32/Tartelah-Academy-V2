// Quran session report lifecycle (Phase 2 §10) — draft -> submitted ->
// (correction_requested -> resubmitted ->) approved. One report per Session
// (see models/QuranSessionReport.js's doc-comment for why it deliberately
// does not duplicate attendance/memorization/revision/evaluation data).
const Session = require('../models/Session')
const QuranSessionReport = require('../models/QuranSessionReport')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')

class QuranReportError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

/** Loads a report's owning session and asserts the teacher actually owns it. */
async function assertTeacherOwnsSession(sessionId, teacherId) {
  const session = await Session.findOne({ _id: sessionId, teacherId })
  if (!session) throw new QuranReportError('الحصة غير موجودة أو لا تخصك', 404)
  return session
}

/**
 * Creates the report as a draft the first time a teacher touches a given
 * session's report (idempotent — a second call for the same session just
 * updates the still-open draft, never creates a duplicate; see the model's
 * unique sessionId index). Only meaningful for a `draft` or already
 * `correction_requested` report — once `submitted`/`approved`, edits must go
 * through `submitReport`/`resubmitReport` explicitly (a save-as-draft while
 * genuinely under review would be confusing).
 */
async function saveDraft(sessionId, { teacherId, fields }) {
  const session = await assertTeacherOwnsSession(sessionId, teacherId)
  let report = await QuranSessionReport.findOne({ sessionId })
  if (!report) {
    report = await QuranSessionReport.create({
      sessionId, studentId: session.studentId, teacherId, createdBy: teacherId,
      history: [{ action: 'created', actorId: teacherId }],
    })
  }
  if (!['draft', 'correction_requested'].includes(report.status)) {
    throw new QuranReportError('لا يمكن تعديل هذا التقرير في حالته الحالية إلا عبر إعادة الإرسال', 409)
  }
  Object.assign(report, fields)
  await report.save()
  return report
}

const REPORTABLE_FIELDS = ['evaluationId', 'tajweedNotes', 'interactiveActivity', 'nextSessionHomework', 'teacherNotes', 'referenceLink']

function pickReportFields(input = {}) {
  const out = {}
  REPORTABLE_FIELDS.forEach((k) => { if (input[k] !== undefined) out[k] = input[k] })
  return out
}

/**
 * Finalizes and submits a report. `memorization`/`revision` (optional
 * arrays of `{surahNumber, fromAyah, toAyah, quality, teacherNotes}`) are
 * created here through the SAME canonical Memorization/Revision models the
 * rest of the platform already uses (never a parallel representation) —
 * this is what lets "fill the report" double as "record today's recitation/
 * revision" in one screen, per the brief's "part of the session-completion
 * experience" requirement.
 */
async function submitReport(sessionId, { teacherId, fields, memorization = [], revision = [] }) {
  const session = await assertTeacherOwnsSession(sessionId, teacherId)
  let report = await QuranSessionReport.findOne({ sessionId })
  if (!report) {
    report = new QuranSessionReport({ sessionId, studentId: session.studentId, teacherId, createdBy: teacherId, history: [] })
  }
  if (!['draft', 'correction_requested'].includes(report.status)) {
    throw new QuranReportError('لا يمكن إرسال هذا التقرير في حالته الحالية', 409)
  }

  Object.assign(report, pickReportFields(fields))
  const wasCorrection = report.status === 'correction_requested'
  report.status = 'submitted'
  report.submittedAt = new Date()
  report.history.push({ action: wasCorrection ? 'resubmitted' : 'submitted', actorId: teacherId })
  await report.save()

  for (const m of memorization) {
    await Memorization.create({ studentId: session.studentId, teacherId, sessionId, ...m })
  }
  for (const r of revision) {
    await Revision.create({ studentId: session.studentId, teacherId, sessionId, ...r })
  }

  return report
}

async function requestCorrection(reportId, { adminId, reason }) {
  if (!reason?.trim()) throw new QuranReportError('سبب طلب التصحيح مطلوب', 400, 'reason')
  const report = await QuranSessionReport.findById(reportId)
  if (!report) throw new QuranReportError('التقرير غير موجود', 404)
  if (report.status !== 'submitted') throw new QuranReportError('لا يمكن طلب تصحيح لتقرير في هذه الحالة', 409)
  report.status = 'correction_requested'
  report.correctionReason = reason.trim()
  report.history.push({ action: 'correction_requested', actorId: adminId, note: reason.trim() })
  await report.save()
  return report
}

async function approveReport(reportId, { adminId }) {
  const report = await QuranSessionReport.findById(reportId)
  if (!report) throw new QuranReportError('التقرير غير موجود', 404)
  if (report.status !== 'submitted') throw new QuranReportError('لا يمكن اعتماد تقرير في هذه الحالة', 409)
  report.status = 'approved'
  report.reviewedBy = adminId
  report.reviewedAt = new Date()
  report.history.push({ action: 'approved', actorId: adminId })
  await report.save()
  return report
}

/** Full read model for one session's report — the canonical, non-duplicated
 * memorization/revision/evaluation data joined in at read time. */
async function getSessionReportDetail(sessionId) {
  const [report, memorization, revision] = await Promise.all([
    QuranSessionReport.findOne({ sessionId })
      .populate('studentId', 'firstNameAr lastNameAr avatar')
      .populate('teacherId', 'firstNameAr lastNameAr avatar')
      .populate('evaluationId')
      .populate('reviewedBy', 'firstNameAr lastNameAr'),
    Memorization.find({ sessionId }).sort({ createdAt: 1 }),
    Revision.find({ sessionId }).sort({ createdAt: 1 }),
  ])
  if (!report) return null
  const session = await Session.findById(sessionId).select('scheduledAt durationMinutes actualStartAt actualEndAt status teacherAttendanceStatus delayMinutes')
  return { report, session, memorization, revision }
}

module.exports = { QuranReportError, saveDraft, submitReport, requestCorrection, approveReport, getSessionReportDetail }

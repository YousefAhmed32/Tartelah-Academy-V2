const mongoose = require('mongoose')

// One Quran-session report per Session (Phase 2 §10). Deliberately does NOT
// duplicate data already canonical elsewhere:
//   - attendance/delay/actual duration -> Session/Attendance (read via sessionId)
//   - recitation/memorization line items -> Memorization (sessionId-linked)
//   - revision line items -> Revision (sessionId-linked)
//   - student level score -> Evaluation (linked via evaluationId below)
// This document only holds the fields genuinely specific to the report
// itself (narrative notes, the lifecycle, and the audit trail), plus a
// denormalized studentId/teacherId copy purely for cheap, indexed listing
// queries (mirrors the same denormalization Session itself already uses).
const QuranSessionReportSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── أولاً: إنجاز الحلقة ──────────────────────────────────────────────────
  todayRecitation: { type: String, trim: true, maxlength: 2000 }, // ما تم تسميعه في حلقة اليوم
  todayRevision: { type: String, trim: true, maxlength: 2000 },   // ما تم مراجعته

  // ── ثانياً: الإنجاز المطلوب للحلقة القادمة ────────────────────────────────
  nextRecitation: { type: String, trim: true, maxlength: 2000 },  // التسميع
  nextRevision: { type: String, trim: true, maxlength: 2000 },    // المراجعة
  nextManners: { type: String, trim: true, maxlength: 2000 },     // الآداب / الأحاديث
  nextTajweed: { type: String, trim: true, maxlength: 2000 },     // التجويد
  quranLink: { type: String, trim: true, maxlength: 1000 },       // رابط المصحف

  // ── ثالثاً: تقييم المعلم للطالب ──────────────────────────────────────────
  memorizationLevel: {
    type: String,
    enum: ['excellent', 'very_good', 'good', 'needs_followup', 'ممتاز', 'جيد جدًا', 'جيد', 'يحتاج متابعة'],
    trim: true,
  },
  revisionLevel: {
    type: String,
    enum: ['excellent', 'very_good', 'good', 'needs_followup', 'ممتاز', 'جيد جدًا', 'جيد', 'يحتاج متابعة'],
    trim: true,
  },
  tajweedLevel: {
    type: String,
    enum: ['excellent', 'very_good', 'good', 'needs_followup', 'ممتاز', 'جيد جدًا', 'جيد', 'يحتاج متابعة'],
    trim: true,
  },
  engagementLevel: {
    type: String,
    enum: ['excellent', 'very_good', 'good', 'needs_followup', 'ممتاز', 'جيد جدًا', 'جيد', 'يحتاج متابعة'],
    trim: true,
  },
  generalEvaluation: { type: String, trim: true, maxlength: 2000 }, // التقييم العام للطالب

  // ── رابعاً: ملاحظات لولي الأمر ──────────────────────────────────────────
  parentNotes: { type: String, trim: true, maxlength: 2000 },    // ملاحظات لولي الأمر
  importantAlert: { type: String, trim: true, maxlength: 2000 }, // تنبيه

  // ── Legacy fallbacks (preserved for backward compatibility) ───────────────
  evaluationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', default: null },
  tajweedNotes: { type: String, trim: true, maxlength: 1000 },
  interactiveActivity: { type: String, trim: true, maxlength: 500 },
  nextSessionHomework: { type: String, trim: true, maxlength: 500 },
  teacherNotes: { type: String, trim: true, maxlength: 1000 },
  referenceLink: { type: String, trim: true, maxlength: 500 },

  status: {
    type: String,
    enum: ['draft', 'submitted', 'correction_requested', 'approved'],
    default: 'draft',
    index: true,
  },
  correctionReason: { type: String, trim: true },
  submittedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },

  // Bounded append-only transition log — who did what, when, and why.
  history: [{
    action: { type: String, enum: ['created', 'submitted', 'correction_requested', 'resubmitted', 'approved'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    note: { type: String },
    _id: false,
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

QuranSessionReportSchema.index({ sessionId: 1 }, { unique: true })
QuranSessionReportSchema.index({ teacherId: 1, status: 1, createdAt: -1 })
QuranSessionReportSchema.index({ studentId: 1, createdAt: -1 })
QuranSessionReportSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('QuranSessionReport', QuranSessionReportSchema)

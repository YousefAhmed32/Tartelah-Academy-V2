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

  evaluationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', default: null },
  tajweedNotes: { type: String, trim: true, maxlength: 1000 },
  interactiveActivity: { type: String, trim: true, maxlength: 500 },
  // Lightweight freeform "what to prepare next time" note — deliberately
  // NOT the formal multi-student Homework system (models/Homework.js); a
  // report can optionally ALSO create/link a real Homework assignment, but
  // this field always exists as the simple per-session note the brief asks for.
  nextSessionHomework: { type: String, trim: true, maxlength: 500 },
  teacherNotes: { type: String, trim: true, maxlength: 1000 },
  referenceLink: { type: String, trim: true, maxlength: 500 }, // Mushaf/playlist/useful link

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

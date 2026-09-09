const mongoose = require('mongoose')

// One persisted monthly report per teacher per academy-timezone calendar
// month (Phase 2 §12). Deliberately NOT a live aggregation recomputed on
// every page view — every numeric field here is a SNAPSHOT taken at
// generation time (see services/monthlyReport.service.js#generateReport)
// and re-taken only on an explicit, authorized regeneration — "avoid an
// unbounded live aggregation every time the page opens; persist the
// monthly artifact and refresh deliberately." An approved report's numbers
// never change silently even if source Session/report data is edited later.
const MonthlyTeacherReportSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  periodKey: { type: String, required: true }, // `${year}-${String(month).padStart(2,'0')}`

  status: {
    type: String,
    enum: ['draft', 'submitted', 'needs_completion', 'reviewed', 'approved'],
    default: 'draft',
  },

  // ── Snapshot: session/attendance/report counts ──
  scheduledSessions: { type: Number, default: 0 },
  conductedSessions: { type: Number, default: 0 }, // completed + no_show
  completedSessions: { type: Number, default: 0 },
  cancelledSessions: { type: Number, default: 0 },
  postponedSessions: { type: Number, default: 0 }, // rescheduled
  submittedReports: { type: Number, default: 0 }, // QuranSessionReport at/past 'submitted'
  missingReports: { type: Number, default: 0 },
  assignedStudentsCount: { type: Number, default: 0 },
  attendanceSummary: {
    onTime: { type: Number, default: 0 }, late: { type: Number, default: 0 },
    absent: { type: Number, default: 0 }, excused: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }, punctualityRate: { type: Number, default: 0 },
  },

  // ── Snapshot: financial (linked to, never duplicating, the payroll period) ──
  payrollPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPayrollPeriod' },
  grossEntitlement: { type: Number, default: 0 },
  bonusesTotal: { type: Number, default: 0 },
  deductionsTotal: { type: Number, default: 0 },
  settlementsTotal: { type: Number, default: 0 },
  netPayable: { type: Number, default: 0 },
  currency: { type: String, default: 'EGP' },
  snapshotAt: { type: Date },

  // ── Narrative (teacher-authored) ──
  teacherNotes: { type: String, trim: true, maxlength: 1000 },
  challenges: { type: String, trim: true, maxlength: 1000 },
  recommendations: { type: String, trim: true, maxlength: 1000 },
  adminNotes: { type: String, trim: true, maxlength: 1000 },

  generatedBy: { type: String, enum: ['system', 'admin'], default: 'system' },
  generatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // set only when generatedBy: 'admin'
  submittedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  approvedAt: { type: Date },

  history: [{
    action: { type: String, enum: ['generated', 'regenerated', 'submitted', 'needs_completion', 'reviewed', 'approved'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    note: { type: String },
    _id: false,
  }],
}, { timestamps: true })

MonthlyTeacherReportSchema.index({ teacherId: 1, periodKey: 1 }, { unique: true })
MonthlyTeacherReportSchema.index({ periodKey: 1, status: 1 })
MonthlyTeacherReportSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('MonthlyTeacherReport', MonthlyTeacherReportSchema)

const mongoose = require('mongoose')

const milestone = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  status: { type: String, enum: ['planned', 'in_progress', 'completed'], default: 'planned' },
  completedAt: { type: Date },
  sourceSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  externalTest: {
    testedAt: { type: Date },
    result: { type: String, trim: true, maxlength: 500 },
    note: { type: String, trim: true, maxlength: 1000 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visibleToStudent: { type: Boolean, default: false },
  },
})

const schema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectKey: { type: String, required: true, trim: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  level: { type: String, required: true, trim: true, maxlength: 200 },
  goal: { type: String, required: true, trim: true, maxlength: 1000 },
  nextStep: { type: String, trim: true, maxlength: 1000 },
  individualNeeds: { type: String, trim: true, maxlength: 1000 },
  materialLinks: [{ title: { type: String, trim: true, maxlength: 160 }, url: { type: String, trim: true, maxlength: 1000 },
    visibility: { type: String, enum: ['teacher_only', 'shared'], default: 'teacher_only' } }],
  milestones: { type: [milestone], default: [] },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },
  // Supervisor edits to a published plan wait here. The currently published
  // fields remain visible to the student/teacher until a manager approves.
  pendingRevision: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true, optimisticConcurrency: true })

schema.index({ studentId: 1, subjectKey: 1 }, { unique: true })
schema.index({ status: 1, updatedAt: -1 })
module.exports = mongoose.model('StudentAcademicPlan', schema)

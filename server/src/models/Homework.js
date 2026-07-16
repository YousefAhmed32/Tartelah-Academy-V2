const mongoose = require('mongoose')

const SubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  attachments: [{
    // GridFS file _id — private (see media.controller.js): only the
    // submitting student, the homework's teacher, and admins may view it.
    fileId: mongoose.Schema.Types.ObjectId,
    originalName: String,
    mimetype: String,
    size: Number,
  }],
  submittedAt: { type: Date, default: Date.now },
  grade: { type: Number, min: 0, max: 10 },
  teacherFeedback: { type: String },
  gradedAt: { type: Date },
  status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' },
}, { _id: true, timestamps: false })

const HomeworkSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  titleAr: { type: String, required: true, trim: true },
  descriptionAr: { type: String },
  dueDate: { type: Date, required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  submissions: [SubmissionSchema],
  maxGrade: { type: Number, default: 10 },
}, { timestamps: true })

HomeworkSchema.index({ teacherId: 1, createdAt: -1 })
HomeworkSchema.index({ assignedTo: 1, dueDate: 1 })
HomeworkSchema.index({ dueDate: 1, status: 1 })

module.exports = mongoose.model('Homework', HomeworkSchema)

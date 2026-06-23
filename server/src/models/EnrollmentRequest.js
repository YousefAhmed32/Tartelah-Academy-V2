const mongoose = require('mongoose')

const EnrollmentRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'card', 'other'],
    default: 'bank_transfer',
  },
  paymentReference: { type: String, trim: true },
  paymentProofUrl: { type: String },
  amount: { type: Number, default: 0 },
  studentNotes: { type: String, trim: true, maxlength: 500 },
  adminNotes: { type: String, trim: true, maxlength: 500 },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  levelId: { type: String, trim: true },
  groupName: { type: String, trim: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
}, { timestamps: true })

EnrollmentRequestSchema.index({ studentId: 1, status: 1 })
EnrollmentRequestSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('EnrollmentRequest', EnrollmentRequestSchema)

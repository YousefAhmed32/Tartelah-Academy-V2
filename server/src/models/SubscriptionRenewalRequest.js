const mongoose = require('mongoose')

// Subscription renewal request (Phase 2 §9) — mirrors EnrollmentRequest's
// proven submit → (proof upload) → review → approve/reject lifecycle
// exactly, so a student's renewal experience feels identical to their
// original enrollment rather than a second, differently-shaped flow. On
// approval this produces a real Subscription (via subscription.service.js,
// same helper enrollment/onboarding already use) plus an additive
// LessonWallet credit — it never mutates or zeroes the subscription being
// renewed (see Subscription.renewedFromSubscriptionId/renewsIntoSubscriptionId).
const SubscriptionRenewalRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  requestedPackageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  // Omitted/equal to the current subscription's teacherId = "keep the same
  // teacher and schedule" (the common case — nothing else needs to change).
  // A genuinely different value is a teacher-change request, executed on
  // approval via the EXISTING transfer.service.js primitive — never a
  // second, competing teacher-reassignment implementation.
  requestedTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled', 'expired'],
    default: 'pending',
    index: true,
  },
  paymentMethod: { type: String, enum: ['bank_transfer', 'cash', 'card', 'other'], default: 'bank_transfer' },
  paymentReference: { type: String, trim: true },
  // GridFS file _id — private (see media.controller.js), same convention as
  // EnrollmentRequest.paymentProofId: only the owning student and admins may view it.
  paymentProofId: { type: mongoose.Schema.Types.ObjectId, default: null },
  amount: { type: Number, default: 0 },

  studentNotes: { type: String, trim: true, maxlength: 500 },
  adminNotes: { type: String, trim: true, maxlength: 500 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },

  // Set only once actually approved+executed — the durable link from this
  // request to what it produced, for the renewal-history display.
  resultingSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  resultingTransferId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentTransfer' }, // set only on a teacher-change approval
  walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonTransaction' },

  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancelReason: { type: String, trim: true },
}, { timestamps: true })

SubscriptionRenewalRequestSchema.index({ studentId: 1, status: 1 })
SubscriptionRenewalRequestSchema.index({ status: 1, createdAt: -1 })
SubscriptionRenewalRequestSchema.index({ currentSubscriptionId: 1 })

module.exports = mongoose.model('SubscriptionRenewalRequest', SubscriptionRenewalRequestSchema)

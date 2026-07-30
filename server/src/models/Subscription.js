const mongoose = require('mongoose')

const SubscriptionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  // Snapshot of the package's Arabic name at the moment this subscription was
  // created — the live Package document can be renamed later by an admin;
  // this keeps historical subscriptions readable without rewriting the past.
  // Optional/backward-compatible: older subscriptions predate this field and
  // fall back to the live `packageId.nameAr` wherever they're displayed.
  packageNameAr: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled', 'paused'], default: 'active' },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  // DEPRECATED as the source of lesson entitlement — LessonWallet now owns
  // lesson counts (see models/LessonWallet.js). These two fields are kept
  // and dual-written by wallet.service.js purely as a read-only mirror so
  // any not-yet-migrated code/UI reading subscription.sessionsRemaining
  // keeps working during rollout. Do not write to them directly anymore.
  sessionsRemaining: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // The LessonTransaction created when this subscription's purchase credited
  // the student's wallet (see wallet.service.js / enrollment.controller.js).
  walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonTransaction' },

  // Billing-cycle bookkeeping. Subscription is a purchase/billing record —
  // it no longer owns lesson rights, only payment/renewal accounting.
  invoiceNumber: { type: String },
  billingDate: { type: Date },
  renewalDate: { type: Date },

  // Renewal chain — a renewal creates a NEW Subscription document rather
  // than mutating the old one, so billing history stays intact. These
  // self-refs link the chain together (see subscription.controller.js renew).
  renewedFromSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  renewsIntoSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
}, { timestamps: true })

SubscriptionSchema.index({ studentId: 1, status: 1 })
SubscriptionSchema.index({ teacherId: 1, status: 1 })
SubscriptionSchema.index({ endDate: 1, status: 1 })
SubscriptionSchema.pre('save', function (next) {
  if (this.isNew && !this.endDate) {
    const startMs = (this.startDate || new Date()).getTime()
    const days = this.totalSessions ? Math.ceil(this.totalSessions / 4) * 7 : 30
    this.endDate = new Date(startMs + days * 24 * 60 * 60 * 1000)
  }
  // Never let sessionsRemaining go negative
  if (this.sessionsRemaining < 0) this.sessionsRemaining = 0
  next()
})

module.exports = mongoose.model('Subscription', SubscriptionSchema)

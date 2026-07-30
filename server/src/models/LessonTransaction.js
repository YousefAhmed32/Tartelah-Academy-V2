const mongoose = require('mongoose')

// Append-only ledger — never updated or deleted after creation. A correction
// is always a NEW transaction (type:'admin_edit', referencing the entry it
// corrects via correctsTransactionId), so the full history of what happened
// to a student's lessons is always reconstructable and auditable.
//
// `idempotencyKey` is the concurrency-safety mechanism: every caller that
// can plausibly retry (a cron sweep re-running, a client double-submit,
// an attendance correction re-firing) derives a deterministic key like
// `session:<id>:consume`. The unique index below makes a duplicate call a
// guaranteed no-op instead of a double deduction — see wallet.service.js.
const LessonTransactionSchema = new mongoose.Schema({
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonWallet', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // denormalized for query convenience

  type: {
    type: String,
    enum: [
      'purchase', 'consumption', 'reversal', 'refund', 'bonus',
      'compensation', 'freeze', 'unfreeze', 'transfer_in', 'transfer_out',
      'renewal', 'manual_adjustment', 'admin_edit', 'migration_import',
    ],
    required: true,
  },
  amount: { type: Number, required: true }, // signed integer lesson units: +credit / -debit
  balanceAfter: { type: Number, required: true }, // wallet.remaining snapshot after this entry

  relatedSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  relatedSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  relatedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // counterparty on a transfer

  reason: { type: String },
  performedByRole: { type: String, enum: ['system', 'admin', 'teacher', 'student'], default: 'system' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  idempotencyKey: { type: String },
  correctsTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonTransaction' },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

LessonTransactionSchema.index({ walletId: 1, createdAt: -1 })
LessonTransactionSchema.index({ studentId: 1, createdAt: -1 })
LessonTransactionSchema.index({ relatedSessionId: 1 })
LessonTransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } }, name: 'uniq_idempotency_key' }
)

module.exports = mongoose.model('LessonTransaction', LessonTransactionSchema)

const mongoose = require('mongoose')

// One wallet per student — the canonical source of lesson entitlement,
// replacing Subscription.sessionsRemaining as the thing that actually
// governs whether a student can book/attend a lesson. Time (Subscription)
// only governs billing; lesson rights live here.
//
// The counters below are a materialized cache for fast reads (dashboard
// widgets, booking checks). The append-only LessonTransaction ledger is the
// real source of truth — `remaining` must always equal the sum of every
// non-void transaction's `amount` for this wallet. See wallet.service.js
// for the single write chokepoint that keeps the two in sync, and
// scripts/reconcileWallets.js for drift detection/repair.
const LessonWalletSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  totalPurchased: { type: Number, default: 0 },      // lifetime lessons bought
  totalUsed: { type: Number, default: 0 },            // lifetime lessons consumed
  bonusLessons: { type: Number, default: 0 },          // live bonus-credit balance
  compensationLessons: { type: Number, default: 0 },    // live compensation-credit balance
  frozenLessons: { type: Number, default: 0 },           // lessons currently held while wallet is frozen
  transferredIn: { type: Number, default: 0 },
  transferredOut: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },                // live bookable balance

  status: { type: String, enum: ['active', 'frozen'], default: 'active' },
  freezeReason: { type: String },
  frozenAt: { type: Date },
  frozenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resumeAt: { type: Date },

  lastTransactionAt: { type: Date },
}, { timestamps: true })

// studentId's `unique: true` above already creates the lookup index.
LessonWalletSchema.index({ status: 1 })

module.exports = mongoose.model('LessonWallet', LessonWalletSchema)

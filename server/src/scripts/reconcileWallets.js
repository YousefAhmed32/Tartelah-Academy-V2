// Recomputes every LessonWallet's cached counters from its LessonTransaction
// ledger (the actual source of truth) and reports any drift. The wallet
// write path (wallet.service.js applyTransaction) keeps the two in sync via
// a single atomic $inc per transaction, but this codebase's MongoDB runs as
// a standalone mongod with no multi-document transactions available (see
// ARCHITECTURE_PLAN.md's Lesson Wallet section) — a crash between the
// transaction write and the wallet $inc is the one scenario that could
// leave them apart. This script is the intended recovery/repair tool for
// that scenario, and a general health-check for the wallet subsystem.
//
// Usage:
//   node src/scripts/reconcileWallets.js            (dry run — reports only)
//   node src/scripts/reconcileWallets.js --apply     (writes corrected counters)

function computeExpectedCounters(transactions) {
  const counters = {
    remaining: 0, totalPurchased: 0, totalUsed: 0,
    bonusLessons: 0, compensationLessons: 0, transferredIn: 0, transferredOut: 0,
  }
  for (const tx of transactions) {
    counters.remaining += tx.amount
    switch (tx.type) {
      case 'purchase': case 'renewal': case 'refund': case 'migration_import':
        counters.totalPurchased += tx.amount
        break
      case 'consumption': case 'reversal':
        counters.totalUsed += -tx.amount
        break
      case 'bonus':
        counters.bonusLessons += tx.amount
        break
      case 'compensation':
        counters.compensationLessons += tx.amount
        break
      case 'transfer_out':
        counters.transferredOut += -tx.amount
        break
      case 'transfer_in':
        counters.transferredIn += tx.amount
        break
      default:
        break
    }
  }
  return counters
}

function diffCounters(stored, expected) {
  const drift = {}
  for (const key of Object.keys(expected)) {
    if ((stored[key] || 0) !== expected[key]) drift[key] = { stored: stored[key] || 0, expected: expected[key] }
  }
  return drift
}

async function run() {
  require('dotenv').config()
  const mongoose = require('mongoose')
  const LessonWallet = require('../models/LessonWallet')
  const LessonTransaction = require('../models/LessonTransaction')

  const APPLY = process.argv.includes('--apply')

  await mongoose.connect(process.env.MONGO_URI)
  console.log(`[reconcileWallets] Connected. Mode: ${APPLY ? 'APPLY (will correct drifted wallets)' : 'DRY RUN (no changes)'}`)

  const wallets = await LessonWallet.find({})
  let driftCount = 0

  for (const wallet of wallets) {
    const transactions = await LessonTransaction.find({ walletId: wallet._id }).select('type amount').lean()
    const expected = computeExpectedCounters(transactions)
    const drift = diffCounters(wallet.toObject(), expected)

    if (Object.keys(drift).length) {
      driftCount++
      console.log(`[reconcileWallets] Drift on wallet ${wallet._id} (student ${wallet.studentId}):`)
      for (const [field, { stored, expected: exp }] of Object.entries(drift)) {
        console.log(`   - ${field}: stored=${stored} expected=${exp}`)
      }
      if (APPLY) {
        await LessonWallet.updateOne({ _id: wallet._id }, { $set: expected })
        console.log(`   -> corrected`)
      }
    }
  }

  console.log(`[reconcileWallets] Scanned ${wallets.length} wallet(s), ${driftCount} with drift.`)
  if (driftCount && !APPLY) console.log('[reconcileWallets] Dry run — re-run with --apply to write corrections.')

  await mongoose.disconnect()
}

module.exports = { computeExpectedCounters, diffCounters }

if (require.main === module) {
  run().catch(err => {
    console.error('[reconcileWallets] Failed:', err)
    process.exit(1)
  })
}

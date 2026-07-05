// One-off maintenance script — safe to run multiple times (idempotent).
//
// Why this exists: models/Session.js now has a unique index on
// {seriesId, scheduledAt} (Phase 10 — recurring-session dedupe). If any
// duplicate {seriesId, scheduledAt} pairs already exist in the database
// from before this index was added, MongoDB will fail to build the index
// in the background and log an error, but will NOT crash the running app —
// the index simply won't be enforced until the underlying duplicates are
// removed. This script finds and removes them first.
//
// For each duplicate group, the EARLIEST-created document is kept (it's
// the one most likely to already carry real teacher/student activity —
// attendance, notes, evaluations tied to its _id) and the rest are deleted.
// Any duplicate that has actually diverged in a way that looks meaningful
// (different status, or any attendance/evidence recorded) is left alone and
// printed as a warning for manual review instead of being auto-deleted —
// this script never silently discards real operational history.
//
// Usage:
//   node src/scripts/dedupeSessions.js            (dry run — reports only)
//   node src/scripts/dedupeSessions.js --apply     (actually deletes)

require('dotenv').config()
const mongoose = require('mongoose')
const Session = require('../models/Session')

const APPLY = process.argv.includes('--apply')

function looksSafeToDrop(doc, keeper) {
  // Conservative: only auto-remove a duplicate if it never progressed past
  // the default 'scheduled' state and has no teacher-side activity at all.
  return (
    doc.status === 'scheduled' &&
    doc.teacherAttendanceStatus === 'pending' &&
    !doc.teacherStartedAt &&
    !doc.teacherLinkOpenedAt &&
    !doc.completedAt
  )
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
  console.log(`[dedupeSessions] Connected. Mode: ${APPLY ? 'APPLY (will delete)' : 'DRY RUN (no changes)'}`)

  const dupes = await Session.aggregate([
    { $match: { seriesId: { $exists: true, $ne: null } } },
    { $group: { _id: { seriesId: '$seriesId', scheduledAt: '$scheduledAt' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ])

  if (!dupes.length) {
    console.log('[dedupeSessions] No duplicate {seriesId, scheduledAt} groups found. Nothing to do.')
    await mongoose.disconnect()
    return
  }

  console.log(`[dedupeSessions] Found ${dupes.length} duplicate occurrence group(s).`)

  let removed = 0
  let flaggedForReview = 0

  for (const group of dupes) {
    const docs = await Session.find({ _id: { $in: group.ids } }).sort({ createdAt: 1 })
    const [keeper, ...rest] = docs

    for (const dup of rest) {
      if (looksSafeToDrop(dup)) {
        console.log(`[dedupeSessions] ${APPLY ? 'Deleting' : 'Would delete'} duplicate ${dup._id} (keeping ${keeper._id}) — series ${group._id.seriesId}, ${group._id.scheduledAt.toISOString()}`)
        if (APPLY) await Session.deleteOne({ _id: dup._id })
        removed++
      } else {
        console.warn(`[dedupeSessions] SKIPPING ${dup._id} — has activity (status=${dup.status}), needs manual review. Keeper candidate: ${keeper._id}`)
        flaggedForReview++
      }
    }
  }

  console.log(`[dedupeSessions] Done. ${removed} duplicate(s) ${APPLY ? 'removed' : 'would be removed'}, ${flaggedForReview} flagged for manual review.`)
  await mongoose.disconnect()
}

run().catch(err => {
  console.error('[dedupeSessions] Failed:', err)
  process.exit(1)
})

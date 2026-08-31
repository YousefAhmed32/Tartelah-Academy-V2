// Repairs the onboardingSaveKey unique index introduced by incremental
// onboarding. Safe default is dry-run; pass --apply to mutate the database.
//
// The original schema combined `default: null` with a sparse unique index.
// MongoDB sparse indexes omit missing fields, but they still index explicit
// null values, so the second ordinary User document with null failed E11000.
//
// Usage:
//   npm run migrate-onboarding-save-key-index
//   npm run migrate-onboarding-save-key-index -- --apply

const INDEX_NAME = 'onboardingSaveKey_1'
const APPLY = process.argv.includes('--apply')

function isOnboardingSaveKeyIndex(index) {
  return index?.key?.onboardingSaveKey === 1 && Object.keys(index.key).length === 1
}

async function inspect(collection) {
  const [nullCount, emptyStringCount, indexes] = await Promise.all([
    collection.countDocuments({ onboardingSaveKey: { $type: 10 } }),
    collection.countDocuments({ onboardingSaveKey: '' }),
    collection.indexes(),
  ])

  return {
    nullCount,
    emptyStringCount,
    matchingIndexes: indexes.filter(isOnboardingSaveKeyIndex),
  }
}

async function applyMigration(collection) {
  const cleanup = await collection.updateMany(
    { $or: [{ onboardingSaveKey: { $type: 10 } }, { onboardingSaveKey: '' }] },
    { $unset: { onboardingSaveKey: '' } },
  )

  const indexes = await collection.indexes()
  for (const index of indexes.filter(isOnboardingSaveKeyIndex)) {
    await collection.dropIndex(index.name)
  }

  await collection.createIndex(
    { onboardingSaveKey: 1 },
    {
      name: INDEX_NAME,
      unique: true,
      partialFilterExpression: { onboardingSaveKey: { $type: 'string' } },
    },
  )

  return { cleanedDocuments: cleanup.modifiedCount }
}

async function run() {
  require('dotenv').config()
  const mongoose = require('mongoose')

  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required')

  await mongoose.connect(process.env.MONGO_URI, { dbName: 'tartelah', autoIndex: false })
  const collection = mongoose.connection.collection('users')
  const before = await inspect(collection)

  console.log(`[migrateOnboardingSaveKeyIndex] Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`)
  console.log(`[migrateOnboardingSaveKeyIndex] Explicit null values: ${before.nullCount}`)
  console.log(`[migrateOnboardingSaveKeyIndex] Empty-string values: ${before.emptyStringCount}`)
  console.log(`[migrateOnboardingSaveKeyIndex] Existing matching indexes: ${before.matchingIndexes.map((index) => index.name).join(', ') || 'none'}`)

  if (!APPLY) {
    console.log('[migrateOnboardingSaveKeyIndex] No changes made. Re-run with --apply to repair the live index.')
    await mongoose.disconnect()
    return
  }

  const result = await applyMigration(collection)
  const after = await inspect(collection)
  console.log(`[migrateOnboardingSaveKeyIndex] Removed null/empty values from ${result.cleanedDocuments} document(s).`)
  console.log(`[migrateOnboardingSaveKeyIndex] Active index: ${after.matchingIndexes.map((index) => index.name).join(', ')}`)
  await mongoose.disconnect()
}

module.exports = { INDEX_NAME, isOnboardingSaveKeyIndex, inspect, applyMigration }

if (require.main === module) {
  run().catch((error) => {
    console.error('[migrateOnboardingSaveKeyIndex] Failed:', error.message)
    process.exit(1)
  })
}

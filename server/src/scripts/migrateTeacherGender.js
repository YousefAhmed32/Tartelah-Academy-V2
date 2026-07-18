// Teacher gender audit / backfill — safe to run repeatedly (idempotent).
//
// Why this exists: User.gender (server/src/models/User.js) was added as the
// single canonical source of truth for a teacher's Arabic honorific and
// default-avatar presentation. Existing teacher records created before this
// field existed have no gender set — that is an "unresolved" state, not an
// error. This script never guesses gender from a teacher's Arabic name,
// bio, or anything else (names like "فاطمة" or "علي" are not a reliable
// migration source). It only:
//
//   1. Reports how many teachers already have a valid gender vs. how many
//      are unresolved, so the admin team has a concrete correction list.
//   2. Normalizes any value that is NOT one of the canonical enum values
//      (e.g. legacy casing/typos such as 'Male') to null (unresolved),
//      because Mongoose already rejects invalid enum values on save — an
//      invalid stored value could only exist from a raw DB write that
//      bypassed the model, and we must not silently guess what it meant.
//
// Nothing here ever writes 'male' as a default. Unresolved teachers stay
// unresolved until an admin (or the teacher, via their own settings) sets
// the value explicitly through the validated API.
//
// Usage:
//   node src/scripts/migrateTeacherGender.js            (dry run — reports only)
//   node src/scripts/migrateTeacherGender.js --apply     (writes normalization only)

const { GENDER_VALUES, isValidGender } = require('../config/teacherIdentity')

// Pure — no I/O — so it can be unit-tested without a database.
// Classifies a single teacher record's gender field into exactly one bucket.
function classifyTeacherGender(teacher) {
  const raw = teacher?.gender
  if (raw === undefined || raw === null || raw === '') return { bucket: 'unresolved', normalizedTo: undefined }
  if (isValidGender(raw)) return { bucket: raw, normalizedTo: undefined }
  return { bucket: 'invalid', normalizedTo: null }
}

async function auditTeacherGender(teachers) {
  const summary = { total: teachers.length, male: 0, female: 0, unresolved: 0, invalid: 0 }
  const unresolvedIds = []
  const invalidRecords = []
  const normalizations = []

  for (const teacher of teachers) {
    const { bucket, normalizedTo } = classifyTeacherGender(teacher)
    summary[bucket] = (summary[bucket] || 0) + 1
    if (bucket === 'unresolved') unresolvedIds.push(teacher._id)
    if (bucket === 'invalid') {
      invalidRecords.push({ id: teacher._id, storedValue: teacher.gender })
      normalizations.push({ id: teacher._id, set: normalizedTo })
    }
  }

  return { summary, unresolvedIds, invalidRecords, normalizations }
}

async function run() {
  require('dotenv').config()
  const mongoose = require('mongoose')
  const User = require('../models/User')

  const APPLY = process.argv.includes('--apply')

  await mongoose.connect(process.env.MONGO_URI)
  console.log(`[migrateTeacherGender] Connected. Mode: ${APPLY ? 'APPLY (will normalize invalid values only)' : 'DRY RUN (no changes)'}`)

  const teachers = await User.find({ role: 'teacher' }).select('_id gender firstNameAr lastNameAr').lean()
  const { summary, unresolvedIds, invalidRecords, normalizations } = await auditTeacherGender(teachers)

  console.log(`[migrateTeacherGender] Scanned ${summary.total} teacher(s).`)
  console.log(`[migrateTeacherGender]   already valid male:   ${summary.male}`)
  console.log(`[migrateTeacherGender]   already valid female: ${summary.female}`)
  console.log(`[migrateTeacherGender]   unresolved (no value): ${summary.unresolved}`)
  console.log(`[migrateTeacherGender]   invalid stored value:  ${summary.invalid}`)

  if (invalidRecords.length) {
    console.log('[migrateTeacherGender] Invalid values found (will be cleared to unresolved, never guessed):')
    for (const rec of invalidRecords) console.log(`   - ${rec.id}: "${rec.storedValue}"`)
    if (APPLY) {
      for (const n of normalizations) {
        await User.updateOne({ _id: n.id }, { $set: { gender: n.set } })
      }
      console.log(`[migrateTeacherGender] Normalized ${normalizations.length} invalid record(s) to unresolved.`)
    } else {
      console.log(`[migrateTeacherGender] Dry run — would normalize ${normalizations.length} record(s). Re-run with --apply to write.`)
    }
  }

  if (unresolvedIds.length) {
    console.log(`[migrateTeacherGender] ${unresolvedIds.length} teacher(s) remain unresolved and need admin correction:`)
    const unresolvedTeachers = teachers.filter(t => unresolvedIds.some(id => id.toString() === t._id.toString()))
    for (const t of unresolvedTeachers) console.log(`   - ${t._id}: ${t.firstNameAr || ''} ${t.lastNameAr || ''}`.trim())
  } else {
    console.log('[migrateTeacherGender] No unresolved teachers.')
  }

  console.log(`[migrateTeacherGender] Canonical values: ${GENDER_VALUES.join(', ')}`)
  await mongoose.disconnect()
}

module.exports = { classifyTeacherGender, auditTeacherGender }

if (require.main === module) {
  run().catch(err => {
    console.error('[migrateTeacherGender] Failed:', err)
    process.exit(1)
  })
}

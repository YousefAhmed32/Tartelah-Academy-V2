const User = require('../models/User')

// One-time, idempotent promotion that gives the platform's original
// administrator its isPrimaryAdmin flag — the RBAC+PBAC upgrade's only
// required data migration. Everything else the upgrade needs
// (permissions: [], mustChangePassword: false, displayRoleName: null, …) is
// purely additive schema defaults that Mongoose already applies to
// pre-existing documents on read, so no bulk backfill write is needed for
// them — see models/User.js. Purely additive (never deletes/overwrites
// existing user data), so — like the other migrations in this folder — it
// runs automatically on every boot and is safe to re-run: once any account
// has isPrimaryAdmin: true, it does nothing.
async function rbacUpgrade() {
  const existingPrimary = await User.findOne({ isPrimaryAdmin: true })
  if (existingPrimary) return { promoted: null, status: 'already_migrated' }

  // Prefer the well-known production seed account (server/src/seeders/
  // production/users.seed.js) if present; otherwise fall back to the
  // earliest-created admin account — deterministic so re-running never
  // promotes a different account across environments.
  const candidate =
    (await User.findOne({ role: 'admin', email: 'admin@tartelah.com' })) ||
    (await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }))

  if (!candidate) return { promoted: null, status: 'no_admin_found' }

  candidate.isPrimaryAdmin = true
  await candidate.save({ validateBeforeSave: false })
  console.log(`[migration] rbacUpgrade: promoted ${candidate.email} to Primary Admin`)
  return { promoted: candidate.email, status: 'promoted' }
}

module.exports = { rbacUpgrade }

const User = require('../models/User')
const { ROLES, DEFAULT_PERMISSIONS_BY_ROLE } = require('../config/permissions')

// Additive follow-up to rbacUpgrade.js. The PBAC layer originally only
// covered Team Management (`users.*`/`admins.*`/`permissions.*`/`roles.*`);
// this backfills the new module permissions (students.*, teachers.*,
// courses.*, etc. — see config/permissions.js) onto every already-existing
// `role:'admin'` account so the module route guards that now replace the
// legacy `isAdmin` gate (see admin.routes.js, course.routes.js, ...) don't
// regress access for accounts that already relied on the old role-based
// check. Deliberately excludes admins.*/permissions.assign/users.delete/
// roles.*/settings.update — same reasoning as DEFAULT_PERMISSIONS_BY_ROLE.admin
// itself: this migration never grants more than that constant already
// defines as a plain admin's default.
//
// Never touches isPrimaryAdmin (already bypasses every check) or any
// non-'admin' account (assistant_admin/operator/manager/staff only ever
// gain permissions an authorized actor explicitly grants — unchanged).
// Purely additive (union, never removes an existing grant), idempotent,
// safe to re-run on every boot.
async function rbacModulePermissionsBackfill() {
  const defaults = DEFAULT_PERMISSIONS_BY_ROLE[ROLES.ADMIN] || []
  const admins = await User.find({ role: ROLES.ADMIN, isPrimaryAdmin: { $ne: true } })

  let updated = 0
  for (const admin of admins) {
    const before = Array.isArray(admin.permissions) ? admin.permissions : []
    const missing = defaults.filter((p) => !before.includes(p))
    if (missing.length === 0) continue

    admin.permissions = [...before, ...missing]
    await admin.save({ validateBeforeSave: false })
    updated += 1
  }

  return { checked: admins.length, updated }
}

module.exports = { rbacModulePermissionsBackfill }

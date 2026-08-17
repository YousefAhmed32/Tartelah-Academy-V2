const {
  ALL_PERMISSIONS, ALL_ROLES, ADMIN_FAMILY_ROLES, DEFAULT_PERMISSIONS_BY_ROLE, DEFAULT_DISPLAY_NAMES,
} = require('../config/permissions')
const { sendSuccess } = require('../utils/response')

// Static role metadata (key, default display name, default permission set,
// whether it belongs to the admin family) — feeds the account-creation form
// so an authorized admin can see "what a role gets by default" before
// customizing it. Not a role CRUD system: internal role identifiers stay
// fixed in code (see config/permissions.js).
exports.listRoles = async (req, res, next) => {
  try {
    const roles = ALL_ROLES.map((key) => ({
      key,
      displayName: DEFAULT_DISPLAY_NAMES[key],
      isAdminFamily: ADMIN_FAMILY_ROLES.includes(key),
      defaultPermissions: DEFAULT_PERMISSIONS_BY_ROLE[key] || [],
    }))
    sendSuccess(res, roles)
  } catch (err) { next(err) }
}

exports.listPermissions = async (req, res, next) => {
  try {
    sendSuccess(res, ALL_PERMISSIONS)
  } catch (err) { next(err) }
}

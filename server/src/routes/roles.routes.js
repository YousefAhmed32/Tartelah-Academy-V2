const router = require('express').Router()
const { listRoles } = require('../controllers/rbac.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requireAnyPermission } = require('../middleware/rbac.middleware')

// Readable by anyone who can create/manage accounts, not just roles.view —
// the create-account form needs this list to show each role's default
// permission set before the admin customizes it.
router.get('/', authenticate, requireAnyPermission('roles.view', 'users.create', 'admins.create'), listRoles)

module.exports = router

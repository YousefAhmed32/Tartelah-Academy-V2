const router = require('express').Router()
const { listPermissions } = require('../controllers/rbac.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requireAnyPermission } = require('../middleware/rbac.middleware')

// Readable by anyone who can create/manage accounts or assign permissions —
// the create-account and permission-assignment forms both need the full
// catalog to render their checklists.
router.get('/', authenticate, requireAnyPermission('permissions.view', 'permissions.assign', 'users.create', 'admins.create'), listPermissions)

module.exports = router

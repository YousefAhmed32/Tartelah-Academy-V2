const router = require('express').Router()
const { updateMe, uploadAvatar, listUsers, getUserById, createUser, updateUser, updateUserPermissions, updateUserStatus, resetUserPassword } = require('../controllers/user.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')
const { uploadAvatar: multerAvatar, handleUploadError } = require('../middleware/upload.middleware')

router.patch('/me', authenticate, updateMe)
router.post('/me/avatar', authenticate, multerAvatar, handleUploadError, uploadAvatar)

// ── Admin / Team Management (RBAC + PBAC) ────────────────────────────────────
// Every route below requires the matching permission — see
// config/permissions.js and controllers/user.controller.js for the
// cross-cutting rules (Primary Admin protection, self-escalation, "last
// administrator" protection) enforced inside each handler.
router.get('/', authenticate, requirePermission('users.view'), listUsers)
router.post('/', authenticate, requirePermission('users.create'), createUser)
router.get('/:id', authenticate, requirePermission('users.view'), getUserById)
router.patch('/:id', authenticate, requirePermission('users.update'), updateUser)
router.patch('/:id/permissions', authenticate, requirePermission('permissions.assign'), updateUserPermissions)
router.patch('/:id/status', authenticate, requirePermission('users.disable'), updateUserStatus)
router.post('/:id/reset-password', authenticate, requirePermission('users.reset_password'), resetUserPassword)

module.exports = router

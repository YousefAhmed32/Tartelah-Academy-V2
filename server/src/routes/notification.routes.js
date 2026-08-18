const router = require('express').Router()
const ctrl = require('../controllers/notification.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')

router.use(authenticate)

router.get('/',                    ctrl.getMyNotifications)
router.get('/unread-count',        ctrl.getUnreadCount)
router.patch('/mark-all-read',     ctrl.markAllRead)
router.delete('/read',             ctrl.deleteAllRead)
router.patch('/bulk',              ctrl.bulkUpdate)
router.delete('/bulk',             ctrl.bulkDelete)
router.patch('/:id/read',          ctrl.markOneRead)
router.patch('/:id/unread',        ctrl.markOneUnread)
router.patch('/:id/archive',       ctrl.archiveOne)
router.patch('/:id/unarchive',     ctrl.unarchiveOne)
router.delete('/:id',              ctrl.deleteNotification)
router.post('/admin/broadcast',    requirePermission('notifications.manage'), ctrl.broadcastNotification)
router.get('/admin/logs',          requirePermission('notifications.view'), ctrl.getAdminNotificationLogs)

module.exports = router

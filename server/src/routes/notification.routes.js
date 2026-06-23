const router = require('express').Router()
const ctrl = require('../controllers/notification.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/', ctrl.getMyNotifications)
router.get('/unread-count', ctrl.getUnreadCount)
router.patch('/mark-all-read', ctrl.markAllRead)
router.patch('/:id/read', ctrl.markOneRead)
router.post('/admin/broadcast', isAdmin, ctrl.broadcastNotification)

module.exports = router

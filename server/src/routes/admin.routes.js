const router = require('express').Router()
const ctrl = require('../controllers/admin.controller')
const notifCtrl = require('../controllers/notification.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')

router.use(authenticate, isAdmin)
router.get('/stats', ctrl.getDashboardStats)
router.get('/reports', ctrl.getReports)
router.get('/students', ctrl.getStudents)
router.patch('/students/:id', ctrl.updateStudent)
router.get('/teachers', ctrl.getTeachers)
router.post('/teachers', ctrl.createTeacher)
router.patch('/teachers/:id', ctrl.updateTeacher)
router.get('/sessions', ctrl.getAllSessions)
router.get('/notifications', notifCtrl.getAdminNotificationLogs)
router.post('/notifications/broadcast', notifCtrl.broadcastNotification)

module.exports = router

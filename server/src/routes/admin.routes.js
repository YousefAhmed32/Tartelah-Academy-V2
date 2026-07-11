const router = require('express').Router()
const ctrl = require('../controllers/admin.controller')
const sessionCtrl = require('../controllers/session.controller')
const notifCtrl = require('../controllers/notification.controller')
const auditCtrl = require('../controllers/auditLog.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')

router.use(authenticate, isAdmin)

// Dashboard + Reports
router.get('/stats', ctrl.getDashboardStats)
router.get('/reports', ctrl.getReports)

// Students
router.get('/students', ctrl.getStudents)
router.get('/students/:id', ctrl.getStudent)
router.patch('/students/:id', ctrl.updateStudent)
router.delete('/students/:id', ctrl.deleteStudent)
router.post('/students/:id/reset-password', ctrl.adminResetPassword)

// Academic records per student
router.get('/students/:studentId/academics', ctrl.getStudentAcademics)

// Teachers
router.get('/teachers', ctrl.getTeachers)
router.get('/teachers/:id', ctrl.getTeacher)
router.post('/teachers', ctrl.createTeacher)
router.patch('/teachers/:id', ctrl.updateTeacher)
router.post('/teachers/:id/reset-password', ctrl.adminResetPassword)

// Sessions (admin full control)
router.get('/sessions', ctrl.getAllSessions)
router.post('/sessions', sessionCtrl.adminCreateSession)
router.patch('/sessions/:id', sessionCtrl.adminUpdateSession)
router.delete('/sessions/:id', sessionCtrl.adminDeleteSession)

// Academic overrides
router.patch('/evaluations/:id', ctrl.updateEvaluation)
router.delete('/evaluations/:id', ctrl.deleteEvaluation)
router.patch('/attendance/:id', ctrl.updateAttendanceRecord)
router.patch('/homework/:id', ctrl.updateHomework)

// Schedule rules overview
router.get('/schedule-rules', ctrl.getAllScheduleRules)
router.patch('/schedule-rules/:id', ctrl.updateScheduleRule)

// Notifications
router.get('/notifications', notifCtrl.getAdminNotificationLogs)
router.post('/notifications/broadcast', notifCtrl.broadcastNotification)
router.post('/notifications/individual', ctrl.sendIndividualNotification)

// Audit logs (stats before :id-like generic route to avoid conflicts)
router.get('/audit-logs/stats', auditCtrl.getAuditLogStats)
router.get('/audit-logs', auditCtrl.getAuditLogs)

module.exports = router

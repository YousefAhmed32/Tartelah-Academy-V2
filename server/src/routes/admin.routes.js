const router = require('express').Router()
const ctrl = require('../controllers/admin.controller')
const sessionCtrl = require('../controllers/session.controller')
const notifCtrl = require('../controllers/notification.controller')
const auditCtrl = require('../controllers/auditLog.controller')
const perfCtrl = require('../controllers/teacherPerformance.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')

router.use(authenticate)

// Dashboard + Reports
router.get('/stats', requirePermission('dashboard.view'), ctrl.getDashboardStats)
router.get('/reports', requirePermission('reports.view'), ctrl.getReports)

// Students
router.get('/students', requirePermission('students.view'), ctrl.getStudents)
router.get('/students/:id', requirePermission('students.view'), ctrl.getStudent)
router.patch('/students/:id', requirePermission('students.manage'), ctrl.updateStudent)
router.delete('/students/:id', requirePermission('students.manage'), ctrl.deleteStudent)
router.post('/students/:id/reset-password', requirePermission('students.manage'), ctrl.adminResetPassword)

// Academic records per student
router.get('/students/:studentId/academics', requirePermission('students.view'), ctrl.getStudentAcademics)

// Teachers
router.get('/teachers', requirePermission('teachers.view'), ctrl.getTeachers)
router.get('/teachers/:id', requirePermission('teachers.view'), ctrl.getTeacher)
router.post('/teachers', requirePermission('teachers.manage'), ctrl.createTeacher)
router.patch('/teachers/:id', requirePermission('teachers.manage'), ctrl.updateTeacher)
router.post('/teachers/:id/reset-password', requirePermission('teachers.manage'), ctrl.adminResetPassword)

// Sessions (admin full control)
router.get('/sessions', requirePermission('sessions.view'), ctrl.getAllSessions)
router.post('/sessions', requirePermission('sessions.manage'), sessionCtrl.adminCreateSession)
router.patch('/sessions/:id', requirePermission('sessions.manage'), sessionCtrl.adminUpdateSession)
router.delete('/sessions/:id', requirePermission('sessions.manage'), sessionCtrl.adminDeleteSession)

// Academic overrides
router.patch('/evaluations/:id', requirePermission('sessions.manage'), ctrl.updateEvaluation)
router.delete('/evaluations/:id', requirePermission('sessions.manage'), ctrl.deleteEvaluation)
router.patch('/attendance/:id', requirePermission('sessions.manage'), ctrl.updateAttendanceRecord)
router.patch('/homework/:id', requirePermission('sessions.manage'), ctrl.updateHomework)

// Schedule rules — admin has full authority over any teacher's schedule
router.get('/schedule-rules', requirePermission('scheduleRules.view'), ctrl.getAllScheduleRules)
router.patch('/schedule-rules/:id', requirePermission('scheduleRules.manage'), ctrl.updateScheduleRule)
router.delete('/schedule-rules/:id', requirePermission('scheduleRules.manage'), ctrl.deleteScheduleRule)
router.post('/schedule-rules/:id/generate-more', requirePermission('scheduleRules.manage'), ctrl.generateMoreScheduleRule)

// Notifications
router.get('/notifications', requirePermission('notifications.view'), notifCtrl.getAdminNotificationLogs)
router.post('/notifications/broadcast', requirePermission('notifications.manage'), notifCtrl.broadcastNotification)
router.post('/notifications/individual', requirePermission('notifications.manage'), ctrl.sendIndividualNotification)

// Audit logs (stats before :id-like generic route to avoid conflicts)
router.get('/audit-logs/stats', requirePermission('audit.view'), auditCtrl.getAuditLogStats)
router.get('/audit-logs', requirePermission('audit.view'), auditCtrl.getAuditLogs)

// Payroll ledger browser — the persisted TeacherPayrollEntry artifact (see
// payrollLedger.service.js), not a live recount.
router.get('/payroll/ledger', requirePermission('reports.view'), perfCtrl.getAdminPayrollLedger)

module.exports = router

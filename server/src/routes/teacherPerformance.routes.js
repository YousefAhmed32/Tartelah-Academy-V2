const router = require('express').Router()
const ctrl = require('../controllers/teacherPerformance.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, requirePermission } = require('../middleware/rbac.middleware')

router.use(authenticate)

// Self (teacher's own performance)
router.get('/me/summary', isAdminOrTeacher, ctrl.getMySummary)
router.get('/me/attendance', isAdminOrTeacher, ctrl.getMyAttendanceHistory)
router.get('/me/trend', isAdminOrTeacher, ctrl.getMyTrend)
router.get('/me/payroll-readiness', isAdminOrTeacher, ctrl.getMyPayrollReadiness)

// Admin — org-wide + per-teacher drill-down (read-only analytics under
// reports.view; the one correction mutation is a teacher-record edit, so
// it's gated by teachers.manage instead).
router.get('/admin/all', requirePermission('reports.view'), ctrl.getAdminAll)
router.get('/admin/salary-report', requirePermission('reports.view'), ctrl.getAdminSalaryReport)
router.get('/admin/payroll-readiness', requirePermission('reports.view'), ctrl.getAdminPayrollReadiness)
router.get('/admin/:teacherId/summary', requirePermission('reports.view'), ctrl.getAdminTeacherSummary)
router.get('/admin/:teacherId/attendance', requirePermission('reports.view'), ctrl.getAdminTeacherAttendance)
router.get('/admin/:teacherId/trend', requirePermission('reports.view'), ctrl.getAdminTeacherTrend)
router.patch('/admin/session/:sessionId/attendance', requirePermission('teachers.manage'), ctrl.correctSessionAttendance)

module.exports = router

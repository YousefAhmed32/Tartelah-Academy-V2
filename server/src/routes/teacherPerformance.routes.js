const router = require('express').Router()
const ctrl = require('../controllers/teacherPerformance.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin, isAdminOrTeacher } = require('../middleware/rbac.middleware')

router.use(authenticate)

// Self (teacher's own performance)
router.get('/me/summary', isAdminOrTeacher, ctrl.getMySummary)
router.get('/me/attendance', isAdminOrTeacher, ctrl.getMyAttendanceHistory)
router.get('/me/trend', isAdminOrTeacher, ctrl.getMyTrend)

// Admin — org-wide + per-teacher drill-down
router.get('/admin/all', isAdmin, ctrl.getAdminAll)
router.get('/admin/salary-report', isAdmin, ctrl.getAdminSalaryReport)
router.get('/admin/:teacherId/summary', isAdmin, ctrl.getAdminTeacherSummary)
router.get('/admin/:teacherId/attendance', isAdmin, ctrl.getAdminTeacherAttendance)
router.get('/admin/:teacherId/trend', isAdmin, ctrl.getAdminTeacherTrend)
router.patch('/admin/session/:sessionId/attendance', isAdmin, ctrl.correctSessionAttendance)

module.exports = router

const router = require('express').Router()
const ctrl = require('../controllers/quranReport.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, authorize, requirePermission } = require('../middleware/rbac.middleware')

router.use(authenticate)

// Teacher self-service (ownership enforced inside the service layer —
// same convention as teacher.routes.js's /me/* routes).
router.post('/sessions/:sessionId/draft', isAdminOrTeacher, ctrl.saveDraft)
router.post('/sessions/:sessionId/submit', isAdminOrTeacher, ctrl.submitReport)
router.get('/me/daily-progress', isAdminOrTeacher, ctrl.getMyDailyProgress)
router.get('/me/overdue', isAdminOrTeacher, ctrl.getMyOverdue)
router.get('/me', isAdminOrTeacher, ctrl.getMyReports)

// Student self-service.
router.get('/student/me', authorize('student'), ctrl.getMyStudentReports)

// Shared: one session's report — visible to its owning teacher, the
// student it's about (once submitted/approved), or any admin.
router.get('/sessions/:sessionId', ctrl.getSessionReport)

// Admin review.
router.get('/admin/all', requirePermission('quranReports.view'), ctrl.getAllReports)
router.get('/admin/overview', requirePermission('quranReports.view'), ctrl.getOverview)
router.get('/admin/overdue-teachers', requirePermission('quranReports.view'), ctrl.getOverdueTeachers)
router.get('/admin/monthly-ratio', requirePermission('quranReports.view'), ctrl.getMonthlyRatio)
router.post('/admin/:id/request-correction', requirePermission('quranReports.manage'), ctrl.requestCorrection)
router.post('/admin/:id/approve', requirePermission('quranReports.manage'), ctrl.approveReport)

module.exports = router
